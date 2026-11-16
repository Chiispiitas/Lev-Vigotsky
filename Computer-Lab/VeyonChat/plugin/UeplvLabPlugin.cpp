// SPDX-License-Identifier: GPL-2.0-or-later
#include "UeplvLabPlugin.h"
#include "TargetMapping.h"
#include "CloudPresence.h"
#include "RemoteRefreshGuard.h"
#include "FeatureManager.h"
#include "VeyonMasterInterface.h"

#include <QAction>
#include <QIcon>
#include <QDir>
#include <QDateTime>
#include <QFile>
#include <QFileInfo>
#include <QJsonArray>
#include <QJsonDocument>
#include <QJsonObject>
#include <QMessageBox>
#include <QMenu>
#include <QProcess>
#include <QSet>
#include <QTimer>
#include <QToolBar>
#include <QToolButton>

namespace {
Feature labFeature(const char* action, const char* id, const QString& label, const char* icon)
{
    return Feature(QString::fromLatin1(action), Feature::Flag::Action | Feature::Flag::Master,
                   Feature::Uid{QString::fromLatin1(id)}, {}, label, {}, label,
                   QString::fromLatin1(icon));
}
}

UeplvLabPlugin::UeplvLabPlugin(QObject* parent) :
    QObject(parent),
    m_features({
        labFeature("chat", "13d77d13-17c5-4970-890b-15ea9685ce06", QStringLiteral("Chat"), ":/ueplv/chat.png"),
        labFeature("class", "13d77d13-17c5-4970-890b-15ea9685ce01", QStringLiteral("Modo Clase con IA"), ":/ueplv/class-ai-allowed.png"),
        labFeature("class-ai", "13d77d13-17c5-4970-890b-15ea9685ce02", QStringLiteral("Modo Clase sin IA"), ":/ueplv/class-ai-blocked.png"),
        labFeature("exam", "13d77d13-17c5-4970-890b-15ea9685ce03", QStringLiteral("Modo Examen"), ":/ueplv/exam.png"),
        labFeature("free", "13d77d13-17c5-4970-890b-15ea9685ce04", QStringLiteral("Modo Libre"), ":/ueplv/free.png"),
        labFeature("close-apps", "13d77d13-17c5-4970-890b-15ea9685ce05", QStringLiteral("Cerrar aplicaciones"), ":/ueplv/close-apps.png")
    })
{
    connect(VeyonCore::instance(), &VeyonCore::applicationLoaded, this, [this]() {
        // Core emits this after Master has constructed its native toolbar and menus.
        if (VeyonCore::component() == VeyonCore::Component::Master)
            QTimer::singleShot(0, this, &UeplvLabPlugin::customizeToolbar);
    });
}

bool UeplvLabPlugin::startFeature(VeyonMasterInterface& master, const Feature& feature,
                                  const ComputerControlInterfaceList& computers)
{
    if (!hasFeature(feature.uid())) return false;
    return invoke(feature.uid(), computers, master.mainWindow());
}

bool UeplvLabPlugin::controlFeature(Feature::Uid uid, Operation operation, const QVariantMap&,
                                    const ComputerControlInterfaceList& computers)
{
    if (!hasFeature(uid) || operation != Operation::Start ||
        VeyonCore::component() != VeyonCore::Component::Master) return false;
    auto master = VeyonCore::instance()->findChild<VeyonMasterInterface*>();
    return invoke(uid, computers, master ? master->mainWindow() : nullptr);
}

bool UeplvLabPlugin::invoke(Feature::Uid uid, const ComputerControlInterfaceList& computers, QWidget* parent)
{
    QString action;
    for (const auto& feature : m_features) if (feature.uid() == uid) { action = feature.name(); break; }
    if (action.isEmpty() || computers.isEmpty()) return false;

    QStringList targets;
    for (const auto& computer : computers) {
        if (!computer) return false;
        const auto target = Ueplv::targetForComputer(computer->computer().hostName(), computer->computer().displayName());
        if (target.isEmpty()) {
            QMessageBox::warning(parent, QStringLiteral("Laboratorio"),
                QStringLiteral("Equipo no reconocido: %1").arg(computer->computer().hostName()));
            return false;
        }
        if (!targets.contains(target)) targets.append(target);
    }
    if (targets.isEmpty()) return false;
    const auto base = qEnvironmentVariable("ProgramData");
    const auto bridge = QDir(base).filePath(QStringLiteral("UEPLV/VeyonIntegration/UEPLV.VeyonBridge.exe"));
    if (base.isEmpty() || !QFileInfo::exists(bridge)) {
        QMessageBox::warning(parent, QStringLiteral("Laboratorio"), QStringLiteral("No se encontró el controlador del laboratorio."));
        return false;
    }
    // Pass discrete arguments directly to a fixed executable, with no shell or student-side command files.
    // The bridge owns authenticated dispatch, acknowledgement, and destructive-action confirmation.
    const bool started = QProcess::startDetached(bridge,
        {QStringLiteral("--action"), action, QStringLiteral("--targets"), targets.join(QLatin1Char(','))},
        QFileInfo(bridge).absolutePath());
    if (!started) QMessageBox::warning(parent, QStringLiteral("Laboratorio"), QStringLiteral("No se pudo iniciar el controlador del laboratorio."));
    return started;
}

void UeplvLabPlugin::customizeToolbar()
{
    auto master = VeyonCore::instance()->findChild<VeyonMasterInterface*>();
    if (!master || !master->mainWindow()) return;
    // Keep one staff receiver alive with Master, including when its chat window is hidden.
    auto chatProcess=new QProcess(this);chatProcess->setObjectName(QStringLiteral("ueplv-teacher-chat"));
    chatProcess->setProgram(QDir(qEnvironmentVariable("ProgramData")).filePath(QStringLiteral("UEPLV/VeyonIntegration/UEPLV.VeyonBridge.exe")));
    chatProcess->setArguments({QStringLiteral("--chat-listen")});chatProcess->start();
    connect(VeyonCore::instance(),&QObject::destroyed,chatProcess,[chatProcess](){if(chatProcess->state()!=QProcess::NotRunning)chatProcess->kill();});
    if (!findChild<QObject*>(QStringLiteral("ueplv-cloud-presence"))) { auto cloud=new CloudPresence(master->mainWindow(),this); cloud->setObjectName(QStringLiteral("ueplv-cloud-presence")); }
    auto refreshGuard = new RemoteRefreshGuard(master,this); refreshGuard->setObjectName(QStringLiteral("ueplv-remote-refresh-guard"));
    auto toolbar = master->mainWindow()->findChild<QToolBar*>(QStringLiteral("toolBar"));
    // Native context menus are populated just before display. Replace only text messaging.
    const auto nativeTextLabel=VeyonCore::featureManager().feature(Feature::Uid{QStringLiteral("e75ae9c8-ac17-4d00-8f0d-019348346208")}).displayName();
    for(auto menu:master->mainWindow()->findChildren<QMenu*>()) connect(menu,&QMenu::aboutToShow,menu,[menu,nativeTextLabel](){
        if(menu->parent()&&QString::fromLatin1(menu->parent()->metaObject()->className())==QStringLiteral("ComputerMonitoringWidget"))
            for(auto action:menu->actions())if(action->text()==nativeTextLabel)action->setVisible(false);
    });
    QJsonArray toolbarResults;
    QJsonArray labToolbarResults;
    const QSet<QString> hidden{QStringLiteral("Demo"), QStringLiteral("RemoteView"),
                               QStringLiteral("RemoteControl"), QStringLiteral("PowerOn"), QStringLiteral("TextMessage")};
    if(toolbar){QAction* chatAction=nullptr;QAction* oldAction=nullptr;for(auto action:toolbar->actions()){auto widget=toolbar->widgetForAction(action);if(widget&&widget->objectName()==QStringLiteral("chat"))chatAction=action;if(widget&&widget->objectName()==QStringLiteral("TextMessage"))oldAction=action;}
        if(chatAction&&oldAction){toolbar->removeAction(chatAction);toolbar->insertAction(oldAction,chatAction);
            auto announce=new QAction(QIcon(QStringLiteral(":/ueplv/chat.png")),QStringLiteral("Anuncio"),toolbar);announce->setObjectName(QStringLiteral("ueplv-announcement"));toolbar->insertAction(oldAction,announce);if(auto button=qobject_cast<QToolButton*>(toolbar->widgetForAction(announce))){button->setObjectName(QStringLiteral("Announcement"));button->setToolButtonStyle(Qt::ToolButtonTextUnderIcon);button->setIconSize(QSize(64,64));}
            connect(announce,&QAction::triggered,this,[](){QStringList targets;for(int i=1;i<=33;++i)targets.append(QStringLiteral("UEPLV-%1").arg(i,2,10,QLatin1Char('0')));const auto bridge=QDir(qEnvironmentVariable("ProgramData")).filePath(QStringLiteral("UEPLV/VeyonIntegration/UEPLV.VeyonBridge.exe"));QProcess::startDetached(bridge,{QStringLiteral("--action"),QStringLiteral("chat"),QStringLiteral("--targets"),targets.join(QLatin1Char(','))});});}}
    if (toolbar) for (auto action : toolbar->actions()) {
        auto widget = toolbar->widgetForAction(action);
        if (widget && hidden.contains(widget->objectName())) {
            action->setVisible(false);
            toolbarResults.append(QJsonObject{{QStringLiteral("name"), widget->objectName()},
                                             {QStringLiteral("hidden"), !action->isVisible()}});
        }
        if (widget) for (const auto& feature : m_features) {
            if (widget->objectName() == feature.name())
                labToolbarResults.append(QJsonObject{{QStringLiteral("action"), feature.name()},
                                                      {QStringLiteral("visible"), action->isVisible()}});
        }
    }
    // QWidgetActions retain their default widgets when detached and reinserted.
    // Move only our feature actions, preserving the native viewing/control order.
    QJsonArray toolbarOrder;
    bool separatedAtEnd = false;
    if (toolbar) {
        QList<QAction*> labActions;
        for (const auto& feature : m_features) {
            if(feature.name()==QStringLiteral("chat"))continue;
            for (auto action : toolbar->actions()) {
                auto widget = toolbar->widgetForAction(action);
                if (widget && widget->objectName() == feature.name()) { labActions.append(action); break; }
            }
        }
        if (labActions.size() == m_features.size()-1) {
            for (auto action : labActions) toolbar->removeAction(action);
            auto separator = toolbar->findChild<QAction*>(QStringLiteral("ueplv-lab-separator"));
            if (!separator) { separator = toolbar->addSeparator(); separator->setObjectName(QStringLiteral("ueplv-lab-separator")); }
            for (auto action : labActions) toolbar->addAction(action);
            const auto order = toolbar->actions();
            separatedAtEnd = order.indexOf(separator) == order.size() - labActions.size() - 1;
            labToolbarResults = QJsonArray{};
            for (int i = 0; i < labActions.size(); ++i) {
                auto action = labActions[i]; auto widget = toolbar->widgetForAction(action);
                const auto& feature = m_features[i+1];
                separatedAtEnd = separatedAtEnd && order.at(order.size()-labActions.size()+i) == action;
                labToolbarResults.append(QJsonObject{{QStringLiteral("action"), feature.name()},
                    {QStringLiteral("label"), feature.displayName()},
                    {QStringLiteral("visible"), action->isVisible() && widget != nullptr},
                    {QStringLiteral("iconLoaded"), !QIcon(feature.iconUrl()).pixmap(48,48).isNull()}});
            }
        }
        for (auto action : toolbar->actions()) {
            auto widget = toolbar->widgetForAction(action);
            if (action->isVisible()) toolbarOrder.append(action->isSeparator() ? QStringLiteral("separator") : (widget ? widget->objectName() : action->text()));
        }
    }
    // Keep the underlying Veyon features enabled: their per-computer context actions remain available.
    QJsonArray features;
    for (const auto& feature : m_features)
        features.append(QJsonObject{{QStringLiteral("action"), feature.name()},
                                    {QStringLiteral("uid"), feature.uid().toString()}});
    const auto localData = qEnvironmentVariable("LOCALAPPDATA");
    if (localData.isEmpty()) return;
    const auto directory = QDir(localData).filePath(QStringLiteral("UEPLV/VeyonIntegration"));
    if (!QDir().mkpath(directory)) return;
    QFile report(QDir(directory).filePath(QStringLiteral("plugin-status.json")));
    if (report.open(QIODevice::WriteOnly | QIODevice::Truncate)) {
        report.write(QJsonDocument(QJsonObject{
            {QStringLiteral("pluginVersion"), version().toString()},
            {QStringLiteral("veyonVersion"), VeyonCore::versionString()},
            {QStringLiteral("runtimeQtVersion"), QString::fromLatin1(qVersion())},
            {QStringLiteral("buildQtVersion"), QStringLiteral(QT_VERSION_STR)},
            {QStringLiteral("loadedUtc"), QDateTime::currentDateTimeUtc().toString(Qt::ISODate)},
            {QStringLiteral("registeredFeatures"), features},
            {QStringLiteral("toolbarFound"), toolbar != nullptr},
            {QStringLiteral("customGroupAtEnd"), separatedAtEnd},
            {QStringLiteral("toolbarOrder"), toolbarOrder},
            {QStringLiteral("labToolbarButtons"), labToolbarResults},
            {QStringLiteral("hiddenToolbarButtons"), toolbarResults}
        }).toJson());
    }
}
