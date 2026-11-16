// SPDX-License-Identifier: GPL-2.0-or-later
#include "CloudPresence.h"
#include "TargetMapping.h"
#include "ComputerListModel.h"
#include "ComputerControlInterface.h"
#include "VeyonMasterInterface.h"
#include <QApplication>
#include <QDir>
#include <QHelpEvent>
#include <QJsonDocument>
#include <QJsonArray>
#include <QJsonObject>
#include <QPainter>
#include <QSaveFile>
#include <QStyle>
#include <QToolTip>
#include <QTreeView>
#include "NetworkObjectDirectoryManager.h"
#include "NetworkObjectDirectory.h"


CloudState CloudSnapshot::state(const QString& name,const QDateTime& now) const {
    // Neither DNS resolution nor a Veyon connection participates in this decision.
    if(name.isEmpty() || !available || !checked.isValid() || checked.msecsTo(now)>45000 || checked.msecsTo(now)<-120000) return CloudState::Unknown;
    const auto last=seen.value(name);
    if(!last.isValid())return CloudState::Offline;
    const auto age=last.msecsTo(now);
    return age>=-120000 && age<=150000 ? CloudState::Online : CloudState::Offline;
}
QColor cloudColor(CloudState state){
    return state==CloudState::Online ? QColor("#1B9762") : state==CloudState::Offline ? QColor("#D64747") : QColor("#9299A4");
}
QRectF cloudDotRect(const QStyleOptionViewItem& o,const QRect& rect,const QString& text){
    const auto first=text.section('\n',0,0);
    const auto width=qMin(o.fontMetrics.horizontalAdvance(first),qMax(0,rect.width()-24));
    const qreal x=qBound(qreal(rect.left()+6),qreal(rect.center().x()+width/2.0+9),qreal(rect.right()-6));
    const qreal y=rect.top()+qMin(rect.height(),o.fontMetrics.height())/2.0;
    return QRectF(x-4.5,y-4.5,9,9);
}
CloudBadgeDelegate::CloudBadgeDelegate(QAbstractItemDelegate* old,const CloudSnapshot* data,Resolver fn,QObject* parent):QStyledItemDelegate(parent),original(old),snapshot(data),resolver(fn){}
QSize CloudBadgeDelegate::sizeHint(const QStyleOptionViewItem& o,const QModelIndex& i) const {
    return original ? original->sizeHint(o,i) : QStyledItemDelegate::sizeHint(o,i);
}
void CloudBadgeDelegate::paint(QPainter* painter,const QStyleOptionViewItem& option,const QModelIndex& index) const {
    if(original)original->paint(painter,option,index);else QStyledItemDelegate::paint(painter,option,index);
    const auto target=resolver(index); if(target.isEmpty())return;
    QStyleOptionViewItem o=option;initStyleOption(&o,index);
    const auto style=o.widget ? o.widget->style() : QApplication::style();
    const auto textRect=style->subElementRect(QStyle::SE_ItemViewItemText,&o,o.widget);
    if(textRect.width()<20||textRect.height()<9)return;
    painter->save();painter->setRenderHint(QPainter::Antialiasing);
    painter->setPen(QPen(o.palette.base().color(),1.5));painter->setBrush(cloudColor(snapshot->state(target)));
    painter->drawEllipse(cloudDotRect(o,textRect,o.text));painter->restore();
}
static QString translated(const QString& key){
    static const QHash<QString,QString> labels{{"class","Modo Clase con IA"},{"class-ai","Modo Clase sin IA"},{"exam","Modo Examen"},{"free","Modo Libre"},{"close-apps","Cerrar aplicaciones"},{"reboot","Reiniciar"},{"shutdown","Apagar"},{"status","Solicitar estado"},{"maintenance","Mantenimiento"},{"maintenance-enter","Entrar a mantenimiento"},{"student-return","Volver a estudiante"},{"cleanup","Limpiar perfil"},{"Prepare","Preparando"},{"Updates","Actualizaciones"},{"Readiness","Verificación"},{"ProtectionPending","Protección pendiente"},{"PostBoot","Verificando reinicio"},{"Complete","Completa"},{"queued","Pendiente"},{"running","En curso"},{"completed","Completada"},{"failed","Falló"},{"rejected","Rechazada"},{"expired","Caducó"},{"awaiting-restart","Esperando reinicio"},{"shutdown-scheduled","Apagado programado"}};
    return labels.value(key,key.isEmpty()?QStringLiteral("Sin datos"):key);
}
QString cloudDetailsHtml(const QJsonObject& device){
    const auto st=device.value("status").toObject(),installation=st.value("installation").toObject(),job=device.value("lastJob").toObject();
    auto install=translated(installation.value("stage").toString());
    if(installation.value("success").isBool()&&!installation.value("success").toBool())install+=QStringLiteral(" · requiere revisión");
    auto mode=translated(st.value("mode").toString());
    if(st.value("modeApplied").isBool()&&!st.value("modeApplied").toBool())mode+=QStringLiteral(" · pendiente");
    auto protection=[&st](const char* enabled,const char* volume){
        if(!st.value(enabled).isBool()||!st.value(volume).isBool())return QStringLiteral("Sin datos");
        return st.value(enabled).toBool()&&st.value(volume).toBool()?QStringLiteral("Activa"):QStringLiteral("Desactivada");
    };
    auto amount=[](double mb){return mb>=1024?QString::number(mb/1024.0,'f',1)+QStringLiteral(" GB"):QString::number(mb,'f',0)+QStringLiteral(" MB");};
    QString space=QStringLiteral("Sin datos");
    if(st.value("overlayMB").isDouble()&&st.value("availableMB").isDouble())space=amount(st.value("overlayMB").toDouble())+QStringLiteral(" usados · ")+amount(st.value("availableMB").toDouble())+QStringLiteral(" libres");
    QString last=QStringLiteral("Sin órdenes");
    if(!job.isEmpty())last=translated(job.value("action").toString())+QStringLiteral(" · ")+translated(job.value("state").toString());
    QString html=QStringLiteral("<table cellspacing='0' cellpadding='0' border='0'>");
    const auto row=[&html](const QString& label,const QString& text){html+=QStringLiteral("<tr><td style='padding:0px 16px 6px 0px;'><b>")+label.toHtmlEscaped()+QStringLiteral("</b></td><td style='padding:0px 0px 6px 0px;'>")+text.toHtmlEscaped()+QStringLiteral("</td></tr>");};
    row(QStringLiteral("Instalación"),install);row(QStringLiteral("Última orden"),last);row(QStringLiteral("Modo"),mode);
    row(QStringLiteral("Protección UWF"),QStringLiteral("Ahora: ")+protection("currentEnabled","currentCProtected")+QStringLiteral(" · Próximo inicio: ")+protection("nextEnabled","nextCProtected"));
    row(QStringLiteral("Espacio temporal"),space);return html+QStringLiteral("</table>");
}
bool CloudBadgeDelegate::helpEvent(QHelpEvent* event,QAbstractItemView* view,const QStyleOptionViewItem& o,const QModelIndex& index){
    const auto name=resolver(index);if(name.isEmpty())return original ? original->helpEvent(event,view,o,index) : false;
    const auto s=snapshot->state(name);
    const auto label=s==CloudState::Online ? QStringLiteral("Wix: conectado") : s==CloudState::Offline ? QStringLiteral("Wix: sin conexión reciente") : QStringLiteral("Wix: sin verificar");
    auto html=index.data(Qt::ToolTipRole).toString()+QStringLiteral("<hr>")+cloudDetailsHtml(snapshot->details.value(name));
    const auto seen=snapshot->seen.value(name);
    if(seen.isValid())html+=QStringLiteral("<br>Último informe: ")+seen.toLocalTime().toString(QStringLiteral("dd/MM HH:mm:ss"))+(s!=CloudState::Online?QStringLiteral(" · datos anteriores"):QString{});
    QToolTip::showText(event->globalPos(),html,view);return true;
}
static QString targetAt(const QModelIndex& index){
    const auto c=index.data(ComputerListModel::ControlInterfaceRole).value<ComputerControlInterface::Pointer>();
    return c ? Ueplv::targetForComputer(c->computer().hostName(),c->computer().displayName()) : QString{};
}
CloudPresence::CloudPresence(QWidget* main,QObject* parent):QObject(parent),window(main),process(new QProcess(this)),refreshTimer(new QTimer(this)),ageTimer(new QTimer(this)),deadline(new QTimer(this)){
    for(auto view:main->findChildren<QAbstractItemView*>())if(view->inherits("ComputerMonitoringWidget")){
        auto old=view->itemDelegate();view->setItemDelegate(new CloudBadgeDelegate(old,&snapshot,targetAt,view));views.append(view);
    }
    process->setProcessChannelMode(QProcess::SeparateChannels);
    deadline->setSingleShot(true);deadline->setInterval(40000);
    connect(deadline,&QTimer::timeout,this,[this]{snapshot.available=false;process->kill();repaintViews();});
    connect(process,&QProcess::readyReadStandardError,this,[this]{process->readAllStandardError();});
    connect(process,&QProcess::errorOccurred,this,[this]{deadline->stop();snapshot.available=false;repaintViews();});
    connect(process,qOverload<int,QProcess::ExitStatus>(&QProcess::finished),this,[this](int code,QProcess::ExitStatus exit){
        deadline->stop();const auto bytes=process->readAllStandardOutput();snapshot.available=false;
        if(code==0&&exit==QProcess::NormalExit&&bytes.size()<131072){
            const auto object=QJsonDocument::fromJson(bytes).object();
            const auto checked=QDateTime::fromString(object.value("checkedUtc").toString(),Qt::ISODateWithMs);
            const auto array=object.value("devices").toArray();
            if(object.value("ok").toBool()&&checked.isValid()&&array.size()<=34){
                QHash<QString,QDateTime> seen;snapshot.details.clear();
                for(const auto& entry:array){const auto item=entry.toObject();const auto name=item.value("name").toString();if(Ueplv::recognizedTarget(name)!=name)continue;seen[name]=QDateTime::fromString(item.value("lastSeenUtc").toString(),Qt::ISODateWithMs);snapshot.details[name]=item;}
                snapshot.seen=seen;snapshot.checked=checked;snapshot.available=true;
            }
        }
        repaintViews();
    });
    refreshTimer->setInterval(15000);connect(refreshTimer,&QTimer::timeout,this,&CloudPresence::refresh);refreshTimer->start();
    ageTimer->setInterval(5000);connect(ageTimer,&QTimer::timeout,this,&CloudPresence::repaintViews);ageTimer->start();
    QTimer::singleShot(0,this,&CloudPresence::refresh);
}
void CloudPresence::refresh(){
    if(process->state()!=QProcess::NotRunning)return;
    const auto path=QDir(qEnvironmentVariable("ProgramData")).filePath("UEPLV/VeyonIntegration/UEPLV.VeyonBridge.exe");
    process->setProgram(path);process->setArguments({QStringLiteral("--presence-snapshot")});process->start();deadline->start();
}
CloudPresence::~CloudPresence(){
    refreshTimer->stop();ageTimer->stop();deadline->stop();process->disconnect(this);
    if(process->state()!=QProcess::NotRunning){process->kill();process->waitForFinished(1000);}
}
void CloudPresence::repaintViews(){for(auto view:views)if(view)view->viewport()->update();report();}
void CloudPresence::report(){
    QJsonArray rows;
    auto master=VeyonCore::instance()->findChild<VeyonMasterInterface*>();
    if(master)for(const auto& c:master->allComputerControlInterfaces()){
        const auto name=Ueplv::targetForComputer(c->computer().hostName(),c->computer().displayName());if(name.isEmpty())continue;
        const auto s=snapshot.state(name);
        rows.append(QJsonObject{{"name",name},{"cloud",s==CloudState::Online?"green":s==CloudState::Offline?"red":"gray"},{"veyonConnected",c->state()==ComputerControlInterface::State::Connected},{"detailsAvailable",!snapshot.details.value(name).value("status").toObject().isEmpty()}});
    }
    QJsonArray directoryRoots,treeRoots;
    auto net=VeyonCore::networkObjectDirectoryManager().configuredDirectory();
    if(net)for(const auto& object:net->objects(net->rootObject()))directoryRoots.append(object.name());
    if(window)for(auto tree:window->findChildren<QTreeView*>()){
        QJsonArray names;auto model=tree->model();if(model)for(int i=0;i<model->rowCount();++i)names.append(model->index(i,0).data().toString());
        treeRoots.append(QJsonObject{{"widget",tree->objectName()},{"roots",names}});
    }
    const auto directory=QDir(qEnvironmentVariable("LOCALAPPDATA")).filePath("UEPLV/VeyonIntegration");
    QSaveFile file(QDir(directory).filePath("cloud-badges-status.json"));if(file.open(QIODevice::WriteOnly)){
        file.write(QJsonDocument(QJsonObject{{"directoryRoots",directoryRoots},{"treeRoots",treeRoots},{"version","1.3.0"},{"viewCount",views.size()},{"available",snapshot.available},{"checkedUtc",snapshot.checked.toString(Qt::ISODateWithMs)},{"refreshSeconds",15},{"devices",rows}}).toJson());file.commit();
    }
}
