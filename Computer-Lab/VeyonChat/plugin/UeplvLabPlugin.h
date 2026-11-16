// SPDX-License-Identifier: GPL-2.0-or-later
#pragma once
#include "FeatureProviderInterface.h"
#include "PluginInterface.h"

class UeplvLabPlugin final : public QObject, public PluginInterface, public FeatureProviderInterface
{
    Q_OBJECT
    Q_PLUGIN_METADATA(IID "io.veyon.Veyon.Plugins.UeplvLab" FILE "plugin.json")
    Q_INTERFACES(PluginInterface FeatureProviderInterface)
public:
    explicit UeplvLabPlugin(QObject* parent = nullptr);
    Plugin::Uid uid() const override { return Plugin::Uid{QStringLiteral("010d64c4-a30a-4b88-b0b5-582c821990d6")}; }
    QVersionNumber version() const override { return QVersionNumber(1, 5, 0); }
    QString name() const override { return QStringLiteral("UeplvLab"); }
    QString description() const override { return QStringLiteral("Controles del laboratorio Lev Vigotsky"); }
    QString vendor() const override { return QStringLiteral("UEPLV"); }
    QString copyright() const override { return QStringLiteral("UEPLV 2026"); }
    const FeatureList& featureList() const override { return m_features; }
    bool controlFeature(Feature::Uid featureUid, Operation operation, const QVariantMap& arguments,
                        const ComputerControlInterfaceList& computers) override;
    bool startFeature(VeyonMasterInterface& master, const Feature& feature,
                      const ComputerControlInterfaceList& computers) override;
private:
    bool invoke(Feature::Uid featureUid, const ComputerControlInterfaceList& computers, QWidget* parent);
    void customizeToolbar();
    const FeatureList m_features;
};
