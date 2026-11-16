// SPDX-License-Identifier: GPL-2.0-or-later
#pragma once
#include <QRegularExpression>
#include <QString>

namespace Ueplv {
inline QString recognizedTarget(const QString& value)
{
    static const QRegularExpression expression(
        QStringLiteral("^(?:LEV-VIGOTSKY-|UEPLV-)([0-9]{2})(?:\\.local)?$"),
        QRegularExpression::CaseInsensitiveOption);
    const auto match = expression.match(value.trimmed());
    if (!match.hasMatch()) return {};
    const auto number = match.captured(1).toInt();
    if (number < 1 || number > 34) return {};
    return QStringLiteral("UEPLV-%1").arg(number, 2, 10, QLatin1Char('0'));
}

inline QString targetForComputer(const QString& hostName, const QString& displayName)
{
    // Host names are authoritative. Never guess from an IP address or a loose number.
    const auto hostTarget = recognizedTarget(hostName);
    const auto displayTarget = recognizedTarget(displayName);
    if (hostTarget.isEmpty() || (!displayTarget.isEmpty() && displayTarget != hostTarget)) return {};
    return hostTarget;
}
}
