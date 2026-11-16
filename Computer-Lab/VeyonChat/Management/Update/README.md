# Automatic online updates

The agent downloads staff-published Wix releases automatically. Installation waits for the next normal restart. A protected PC remains protected for the current class; after installation, one additional automatic restart restores UWF. A PC that was originally unprotected remains unprotected.

## Initial installation contract

Run `Install-AutoUpdate.ps1 -PayloadRoot <this directory> -InitialVersion '1.2.0'` from the elevated lab installer, with UWF disabled for both current and next sessions, before starting `UEPLVAgent`. It copies the coordinator and pinned RSA3072 public key under `C:\Program Files\UEPLV\Management\Update` and registers the SYSTEM task `UEPLV-AutomaticUpdate` at startup and every 15 minutes. Only SYSTEM and administrators can run/change that task. No restart is requested by initial installation.

Before enabling UWF, add exact-file exclusions for these precreated private files:

- `C:\ProgramData\UEPLV\Update\pending-package.json`
- `C:\ProgramData\UEPLV\Update\update-state.json`
- `C:\ProgramData\UEPLV\Update\update-checkpoint.json`

Never exclude the entire cache, rollback directory, Program Files directory, or management program. The initial lab installer must keep the `ProgramData\UEPLV` parent private and Program Files executable paths nonwritable to students. Both journals and the package file are updated in place with a durable flush. A valid checkpoint recovers a torn primary journal; if both journals are invalid, automatic work stops for staff repair.

## Agent and Wix contract

The authenticated cloud reply supplies an envelope `{manifestJson, signature, packageBase64}`. The signature is RSA PKCS#1 v1.5 SHA256 over the exact UTF8 manifest string. The signed manifest contains `{schemaVersion:1, version:'1.2.1', issuedUtc, packageSha256, files:[{path,sha256,size}]}`. Version strings have exactly three numeric components. Package limits are 256 KiB compressed, 8 MiB total unpacked, and 16 files. Each path is exact and case-sensitive:

- `UEPLV.Management.exe`
- `Actions/Invoke-LabAction.ps1`
- `Update/Invoke-AutomaticUpdate.ps1`
- `Commands/[A-Za-z0-9_-]+.json`

Directories, duplicate/extra paths, links, traversal, unknown executable paths, invalid JSON/PowerShell, signature failures, and hash/size failures are rejected before replacement. Decompression is bounded during each read. The pinned public key cannot be changed by an online package. The cloud encryption key and release signing key are separate credentials.

The agent verifies a fetched package and writes the existing private `pending-package.json` in place, closes it, then runs scheduled task `UEPLV-AutomaticUpdate`. The coordinator verifies everything independently. The reader retries brief sharing/partial-write races. The agent reads updater journals for telemetry and phase gating; it never writes them.

## Lifecycle and recovery

State phases are `idle`, `preparing-restart`, `awaiting-normal-restart`, `backing-up`, `installing`, `restoring-protection`, `verifying-protection`, `rolling-back`, `complete`, and `failed`.

The coordinator publishes `preparing-restart` before checking `activeAction`; the agent publishes its action before reading the phase. This handshake prevents a control command racing a protection/file change. During `awaiting-normal-restart`, ordinary class controls remain available, while UWF/repair/reset/Windows-update commands wait. Other busy phases block external mutating commands; internal startup policy restoration must remain available for health checks. Servicing, incomplete initial deployment, maintenance-blocked preparation, or inconsistent current/next UWF states defer installation. In particular, current-off/next-on initial protection is preserved.

After the normal restart, the coordinator independently stops/starts the agent, saves hash-verified backups, replaces only allowlisted files atomically, then requires a fresh `serviceStartId`, stable Running state, applied classroom policies, and no maintenance block. If the EXE is included, `agent.version` must equal the signed version. Command-only packages can advance `installedVersion` while retaining the older executable version.

The healthy-release checkpoint durably records `installedVersion` and phase `restoring-protection`. An interruption before this checkpoint rolls back all recorded old files and `previousInstalledVersion`. An interruption after it finishes restoring protection for the healthy release. Failed versions do not retry automatically; a newer patch can be downloaded. Failed rollback or protection recovery sets `requiresStaffReview=true`, preserves backup records, blocks further upgrades/control changes, and needs staff repair. The restoration restart is limited to one attempt, including after failures; there is no endless reboot retry.

The state also contains `pendingVersion`, `failedVersion`, `lastError`, `lastCheckedUtc`, `completedUtc`, `wasProtected`, boot identifiers, rollback records, and the remaining restart allowance. The dashboard can display these; it must not interpret `restoring-protection` or `verifying-protection` as final completion.

## Verification

Run `Test-AutomaticUpdate.ps1` with 64-bit Windows PowerShell 5.1. Tests load definitions through `-LibraryOnly`, use disposable signed ZIP/journal fixtures, and inject all service/UWF/restart operations. They change no host settings. A pilot lab PC is still required to verify real Windows UWF, startup scheduling, classroom policies, and restoration across actual restarts before deploying to all 33 PCs.
