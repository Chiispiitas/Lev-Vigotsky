// SPDX-License-Identifier: GPL-2.0-or-later
#pragma once
#include <QAbstractItemView>
#include <QDateTime>
#include <QHash>
#include <QJsonObject>
#include <QPointer>
#include <QProcess>
#include <QStyledItemDelegate>
#include <QTimer>
#include <functional>

enum class CloudState { Unknown, Offline, Online };
struct CloudSnapshot {
    QDateTime checked;
    QHash<QString,QDateTime> seen;
    QHash<QString,QJsonObject> details;
    QHash<QString,QJsonObject> commands;
    bool available=false;
    CloudState state(const QString& name,const QDateTime& now=QDateTime::currentDateTimeUtc()) const;
};
QColor cloudColor(CloudState state);
QString cloudDetailsHtml(const QJsonObject& device);
QRectF cloudDotRect(const QStyleOptionViewItem& option, const QRect& textRect, const QString& text);

class CloudBadgeDelegate final: public QStyledItemDelegate {
public:
    using Resolver=std::function<QString(const QModelIndex&)>;
    CloudBadgeDelegate(QAbstractItemDelegate* original,const CloudSnapshot* snapshot,Resolver resolver,QObject* parent);
    void paint(QPainter*,const QStyleOptionViewItem&,const QModelIndex&) const override;
    QSize sizeHint(const QStyleOptionViewItem&,const QModelIndex&) const override;
    bool helpEvent(QHelpEvent*,QAbstractItemView*,const QStyleOptionViewItem&,const QModelIndex&) override;
private:
    QPointer<QAbstractItemDelegate> original;
    const CloudSnapshot* snapshot;
    Resolver resolver;
};

class CloudPresence final: public QObject {
public:
    explicit CloudPresence(QWidget* mainWindow,QObject* parent);
    ~CloudPresence() override;
    void refresh();
private:
    void repaintViews();
    void report();
    CloudSnapshot snapshot;
    QPointer<QWidget> window;
    QList<QPointer<QAbstractItemView>> views;
    QProcess* process;
    QTimer* refreshTimer;
    QTimer* ageTimer;
    QTimer* deadline;
};
