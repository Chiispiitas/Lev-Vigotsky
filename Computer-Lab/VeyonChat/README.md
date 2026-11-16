# Chat del laboratorio

WebView2 chat with the light UEPLV dashboard palette, using the existing Servidor backend and Veyon integration. This is UEPLV's own chat, not Rocket.Chat.

- **Chat** opens the computers selected in Veyon. Teachers can check additional recipients. One send creates a separate private message in each recipient's individual conversation; it never creates a student group chat.
- **Anuncio** in Veyon and **Anuncio a todos** in the window select physical PCs 01–33, leaving the composer ready to send. The reserved VM 34 is excluded from announcements.
- **Solo docente** is the default. Teachers may temporarily enable **Docente ↔ estudiantes** or **Entre estudiantes**. Restarting a PC returns it to teacher-only messaging. An explicit configuration replaces preceding temporary permissions.
- Only teachers may send to multiple recipients, enforced by the server. Students select one conversation at a time, even when student-to-student chat is permitted.
- The teacher receiver remains active while Veyon is open. Students receive a background client and notification-area shortcut automatically.
- Credentials stay in the native host. The web interface receives message/permission data only, has no general API proxy, and cannot navigate to websites, download files, or access host objects.
- Signed management update **1.9.3** embeds the student client. It fetches fixed WebView2 SDK dependencies from this repository with pinned SHA256 hashes. A missing WebView2 Runtime is installed silently using Microsoft's signature-verified installer. Installation readiness waits for dependencies before protection restoration.
- The existing automatic updater downloads updates and installs them during a normal restart cycle, preserving device identities and restoring UWF. Pending older updates finish first. No USB refresh is required for deployed PCs.
- Messages are retained for up to 24 hours, with approximately 200 recent messages across the lab to reserve CMS capacity for device control. Polling is every three seconds; connection errors appear in the chat window.

Teacher sources are in `bridge/`; the embedded student source snapshot is in `Management/ChatSource/`. They can update independently. Microsoft SDK files retain their own license under `Runtime/`.

## Controles del laboratorio

- Modes and Close applications report per-PC progress on the thumbnail: ellipsis, check, or cross. No separate result or confirmation windows are opened for those actions.
- Teacher contacts show separate Veyon and Servidor connection indicators. Missing or stale presence is shown as unverified.
- Browsers are preserved when restrictions are removed or unchanged. Adding restrictions retains the browser-closing safeguard, including live AI/exam sessions.
- Congelar y Reiniciar enables protection for the next boot and restarts selected PCs.
- Descongelar y Reiniciar accepts 1–99 thawed boot sessions (default and recommendation: 1). One means the requested restart opens one thawed session; the following restart restores protection. Service restarts do not spend a boot. The last thawed boot arms protection locally, without requiring network access.
- Timed thaw requires verified private persistent state and configured C: protection. Updates and conflicting maintenance operations wait until the lease completes. Frozen/unfrozen status remains visible in the UWF fields.
