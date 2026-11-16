// SPDX-License-Identifier: GPL-2.0-or-later
#include "CloudPresence.h"
#include <QApplication>
#include <QListView>
#include <QStandardItemModel>
#include <QPainter>
#include <QLabel>
#include <cstdio>
#include <cstdlib>
int main(int argc,char**argv){
    QApplication app(argc,argv);const auto now=QDateTime::currentDateTimeUtc();
    auto check=[](bool ok){if(!ok){std::fputs("Cloud status check failed\n",stderr);std::exit(1);}};
    CloudSnapshot s;s.checked=now;s.available=true;s.seen["UEPLV-01"]=now.addSecs(-10);s.seen["UEPLV-02"]=now.addSecs(-151);
    check(s.state("UEPLV-01",now)==CloudState::Online);check(s.state("UEPLV-02",now)==CloudState::Offline);
    check(s.state("UEPLV-03",now)==CloudState::Offline);check(s.state("",now)==CloudState::Unknown);
    check(s.state("UEPLV-01",now.addSecs(46))==CloudState::Unknown);
    s.seen["UEPLV-04"]=now.addSecs(121);check(s.state("UEPLV-04",now)==CloudState::Offline);
    s.available=false;check(s.state("UEPLV-01",now)==CloudState::Unknown);s.available=true;
    check(cloudColor(CloudState::Online)!=cloudColor(CloudState::Offline));
    QListView view;view.setViewMode(QListView::IconMode);view.setIconSize(QSize(160,95));view.setGridSize(QSize(200,145));view.setSpacing(6);view.setFixedSize(640,170);view.setStyleSheet("QListView { background:#f8f9fb; color:#243451; font:12pt 'Segoe UI';border:none; }");
    QStandardItemModel model;
    for(int i=1;i<=3;i++){
        QPixmap thumb(160,95);thumb.fill(QColor("#e9edf3"));QPainter p(&thumb);p.setPen(QColor("#54647b"));
        p.drawText(thumb.rect().adjusted(4,4,-4,-4),Qt::AlignCenter|Qt::TextWordWrap,i==1 ? "Host name couldn't\nbe resolved" : "Veyon offline");p.end();
        auto item=new QStandardItem(QIcon(thumb),QString("%1").arg(i,2,10,QLatin1Char('0')));item->setData(QString("UEPLV-%1").arg(i,2,10,QLatin1Char('0')),Qt::UserRole);model.appendRow(item);
    }
    s.seen.remove("UEPLV-03");
    view.setModel(&model);auto base=view.itemDelegate();
    view.setItemDelegate(new CloudBadgeDelegate(base,&s,[](const QModelIndex&i){return i.data(Qt::UserRole).toString();},&view));
    view.show();app.processEvents();view.grab().save("cloud-badges-preview.png");
    QJsonObject detail{{"status",QJsonObject{{"mode","class-ai"},{"modeApplied",true},{"currentEnabled",true},{"nextEnabled",false},{"currentCProtected",true},{"nextCProtected",true},{"overlayMB",256},{"availableMB",7936},{"installation",QJsonObject{{"stage","Complete"},{"success",true}}}}},{"lastJob",QJsonObject{{"action","class-ai"},{"state","completed"}}}};
    const auto html=cloudDetailsHtml(detail);check(html.contains("Modo Clase sin IA"));check(html.contains("Próximo inicio: Desactivada"));check(html.contains("256 MB"));check(html.contains("Última orden"));
    check(cloudDetailsHtml(QJsonObject{}).contains("Sin datos"));
    QLabel tip;tip.setTextFormat(Qt::RichText);tip.setText(QStringLiteral("<b>Hostname could not be resolved</b><br>Name: 27<br>Location: UEPLV LAB<br>Hostname: LEV-VIGOTSKY-27.local<hr>Wix: sin conexión reciente")+html+QStringLiteral("<br>Último informe: 15/11 19:30:00 · datos anteriores"));tip.setStyleSheet("QLabel {background:#198bae;color:white;padding:16px;font:12pt 'Segoe UI';}");tip.adjustSize();tip.show();app.processEvents();tip.grab().save("cloud-tooltip-preview.png");
    std::puts("Cloud presence passed: recent, stale, missing, unavailable, future-clock, expired snapshot, independent-of-Veyon and delegate rendering.");return 0;
}
