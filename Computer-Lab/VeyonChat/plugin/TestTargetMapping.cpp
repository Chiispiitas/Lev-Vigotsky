// SPDX-License-Identifier: GPL-2.0-or-later
#include "TargetMapping.h"
#include <QCoreApplication>
#include <cstdio>
#include <cstdlib>

int main(int argc, char** argv)
{
    QCoreApplication app(argc, argv);
    const auto require = [](bool ok, const char* message) { if (!ok) { std::fprintf(stderr, "%s\n", message); std::exit(1); } };
    require(Ueplv::targetForComputer("LEV-VIGOTSKY-01.local", "PC 01") == "UEPLV-01", "Physical PC mapping");
    require(Ueplv::targetForComputer("lev-vigotsky-33.LOCAL", "UEPLV-33") == "UEPLV-33", "Case insensitive match");
    require(Ueplv::targetForComputer("LEV-VIGOTSKY-34", "VM") == "UEPLV-34", "Separate VM target");
    require(Ueplv::targetForComputer("LEV-VIGOTSKY-32.local", "UEPLV-33").isEmpty(), "Conflicting identities rejected");
    require(Ueplv::targetForComputer("192.168.1.32", "UEPLV-32").isEmpty(), "IP addresses cannot guess enrollment");
    require(Ueplv::targetForComputer("LEV-VIGOTSKY-35", "PC35").isEmpty(), "Out of range rejected");
    require(Ueplv::targetForComputer("LEV-VIGOTSKY-00", "PC00").isEmpty(), "Zero rejected");
    require(Ueplv::targetForComputer("LEV-VIGOTSKY-1", "PC1").isEmpty(), "Noncanonical number rejected");
    require(Ueplv::targetForComputer("LEV-VIGOTSKY-01.local.attacker.com", "PC01").isEmpty(), "Host suffix spoof rejected");
    require(Ueplv::targetForComputer("UEPLV-01;cmd", "PC01").isEmpty(), "Command characters rejected");
    std::puts("Target mapping passed 10 checks.");
    return 0;
}
