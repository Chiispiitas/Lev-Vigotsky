// SPDX-License-Identifier: GPL-2.0-or-later
#pragma once
#include "VeyonMasterInterface.h"
#include "VeyonConnection.h"
#include "FeatureManager.h"
#include <QApplication>
#include <QAbstractItemView>
#include "ComputerListModel.h"
#include <QCryptographicHash>
#include <QDir>
#include <QFile>
#include <QJsonArray>
#include <QJsonDocument>
#include <QJsonObject>
#include <QPointer>
#include <QSaveFile>
#include <QSet>
#include <QTimer>

// Live views need explicit periodic incremental requests on clients where the
// transition to streaming loses the next request. Monitoring cadence stays native.
class RemoteRefreshGuard final: public QObject {
public:
    explicit RemoteRefreshGuard(VeyonMasterInterface* master,QObject* parent):QObject(parent),master(master){
        auto timer=new QTimer(this);timer->setInterval(100);
        connect(timer,&QTimer::timeout,this,[this]{
            if(!this->master)return;
            for(const auto& c:this->master->allComputerControlInterfaces())ensureLive(c);
            if(qa)ensureLive(qa);
        });timer->start();
        const auto request=path("remote-qa.request");
        if(QFile::exists(request)){
            QFile::remove(request);
            for(const auto& c:master->allComputerControlInterfaces())if(c->computer().hostName()==QStringLiteral("LEV-VIGOTSKY-34.local")){qa=c;break;}
            if(!qa){save(false);return;}
            auto cycle=new QTimer(this);cycle->setInterval(1000);
            connect(cycle,&QTimer::timeout,this,[this,cycle]{
                if(!qa)return;
                if(++elapsed>90){save(false);cycle->stop();return;}
                if(qa->state()!=ComputerControlInterface::State::Connected)return;
                if(!watching){
                    watching=true;
                    connect(qa.data(),&ComputerControlInterface::framebufferUpdated,this,[this]{
                        if(!qaWindow)return;
                        auto image=qa->vncConnection()->image();
                        if(image.isNull())return;
                        auto hash=QCryptographicHash::hash(QByteArrayView(reinterpret_cast<const char*>(image.constBits()),image.sizeInBytes()),QCryptographicHash::Sha256);
                        ++frames;if(hash!=last){++changes;last=hash;}
                    });
                }
                if(!qaWindow){
                    QSet<QWidget*> before;for(auto w:QApplication::topLevelWidgets())before.insert(w);
                    for(auto view:this->master->mainWindow()->findChildren<QAbstractItemView*>())if(view->inherits("ComputerMonitoringWidget")&&view->model()){
                        for(int row=0;row<view->model()->rowCount();++row){const auto index=view->model()->index(row,0);const auto c=index.data(ComputerListModel::ControlInterfaceRole).value<ComputerControlInterface::Pointer>();if(c==qa)view->selectionModel()->setCurrentIndex(index,QItemSelectionModel::ClearAndSelect);}
                    }
                    const auto selected=this->master->selectedComputerControlInterfaces();
                    if(selected.size()!=1||selected.first()!=qa){save(false);cycle->stop();return;}
                    VeyonCore::featureManager().startFeature(*this->master,VeyonCore::featureManager().feature(QUuid("ca00ad68-1709-4abe-85e2-48dff6ccf8a2")),{qa});
                    for(auto w:QApplication::topLevelWidgets())if(!before.contains(w)&&w->inherits("RemoteAccessWidget"))qaWindow=w;
                    frames=0;changes=0;last.clear();opened=elapsed;
                }else if(elapsed-opened>=8){
                    results.append(QJsonObject{{"frames",frames},{"pixelChanges",changes},{"passed",frames>=8&&changes>=5}});
                    qaWindow->close();qaWindow=nullptr;
                    if(results.size()==3){bool pass=true;for(const auto& r:results)pass=pass&&r.toObject().value("passed").toBool();save(pass);cycle->stop();qa.clear();}
                }
            });cycle->start();
        }
    }
private:
    static QString path(const QString& name){return QDir(qEnvironmentVariable("LOCALAPPDATA")).filePath("UEPLV/VeyonIntegration/"+name);}
    void ensureLive(const ComputerControlInterface::Pointer& c){
        if(c&&c->state()==ComputerControlInterface::State::Connected&&c->updateMode()==ComputerControlInterface::UpdateMode::Live&&c->vncConnection()){
            c->vncConnection()->setSkipFramebufferUpdates(false);
            c->vncConnection()->setFramebufferUpdateInterval(100);
        }
    }
    void save(bool pass){QSaveFile file(path("remote-refresh-qa.json"));if(file.open(QIODevice::WriteOnly)){file.write(QJsonDocument(QJsonObject{{"passed",pass},{"target","UEPLV-34"},{"cycles",results},{"monitoringIntervalUnchanged",true}}).toJson());file.commit();}}
    QPointer<VeyonMasterInterface> master;
    ComputerControlInterface::Pointer qa;
    QPointer<QWidget> qaWindow;
    bool watching=false;int elapsed=0,opened=0,frames=0,changes=0;
    QByteArray last;QJsonArray results;
};
