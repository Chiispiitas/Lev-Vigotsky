# Building

`npm ci && npm test` checks the chat authorization core. The Wix adapter and API routes are installed in the existing UEPLV Lab Control Astro project; its deployed source is stored with the Wix release.

On Windows with .NET Framework 4.8, run `Management/Build-Package.ps1 -CompileOnly` to compile the client from `Management/ChatSource`, embed it into the management agent, and run the agent security checks. This does not install services or change Windows settings. Preserve enrollment files from the existing deployment; never generate replacement device identities as part of a chat update.

The Veyon plugin targets Veyon 4.10.2 and its installed Qt 6.10.3 / MinGW runtime. Follow `plugin/BUILD.md` with the matching Veyon source and import library. Do not load a DLL built against an incompatible Veyon/Qt runtime.

`bridge/Build-Bridge.ps1` compiles the teacher bridge and its native chat window. Install the resulting bridge at the fixed staff integration path used by the plugin. Student clients are embedded and installed by the management service, under Program Files, using the least-privilege interactive logon task.

The public signed update ZIP and metadata are in `bin/`. The existing updater verifies its pinned RSA signature, file hashes, and fixed path allowlist before installation. It waits for a normal restart and restores UWF afterward.

The teacher bridge can update independently of the embedded student client. Teacher sources are in bridge/; the signed student snapshot is in Management/ChatSource/. Run updater regression checks with Windows PowerShell 5.1: powershell.exe -NoProfile -File Management/Update/Test-AutomaticUpdate.ps1.

WebView2 SDK references are included under Runtime/1.0.4314.35. The teacher bridge build uses the matching copies beside its source. Runtime installation on student PCs is automatic; Microsoft-signed SDK dependencies are pinned by SHA256 in ChatDependencies.cs.
