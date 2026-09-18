# Computer Lab — Cloud System Guard

This folder contains the authoritative computer-lab System Guard used through Veyon.

## Architecture

Veyon still launches one file per action and does not need argument support. The small local launchers call a local cloud bootstrap, which downloads the current `Computer-Lab/uwf-menu.bat` from the `main` branch before every execution.

The previous downloaded master is removed before each download. If GitHub cannot be reached, the launcher stops and does **not** execute a stale cached master.

## Local deployment

For the existing lab configuration, use `Launchers/BAT-Compatibility`. Its filenames match the previous package, so existing Veyon launch paths can remain unchanged.

Suggested destination:

`C:\ProgramData\LevVigotsky\`

The `Launchers/CMD` folder contains equivalent `.cmd` variants.

## Cloud master

`uwf-menu.bat` is intentionally the same verified master used before the migration. Initial cloud migration did not refactor its UWF/restriction logic; only delivery changed.

Verified original Git blob SHA: `556a82dee10ad5e0e1f96ec64c9087ab66f90296`.

Bootstrap release: `2026-09-18-cloud1`.
