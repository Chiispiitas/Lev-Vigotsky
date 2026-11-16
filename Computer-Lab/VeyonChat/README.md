# Chat del laboratorio

Implemented with the existing Wix backend and GitHub deployment. This is UEPLV's own chat, not a Rocket.Chat installation.

- Native Veyon **Chat** replaces **Text message** in the toolbar and computer context menu.
- Teacher/student two-way messages are the default. Students open the chat from its notification-area icon.
- Teacher can select **Solo mensajes del docente** or **Permitir entre estudiantes** for the PCs selected in Veyon. Both students need a current peer grant to communicate.
- An explicit configuration replaces the previous temporary grants. A PC restart returns that PC to two-way teacher/student mode and revokes its old student session.
- The teacher can send individually or to all selected PCs. No files or executable attachments are accepted.
- Permissions are checked on the server on each send and read. Student clients receive a signed session token, never the management cloud key or staff cookie.
- Student chat runs as LEV VIGOTSKY in its interactive session. The management service provisions it, refreshes its session, and registers its logon task. Students cannot write its installation or session file.
- The client is embedded in the signed management update, so it does not require a new installer or updater path exception. Release **1.6.2** installs through the existing updater at a normal restart.
- Recent messages are limited to 24 hours and approximately 200 retained messages across the lab, to preserve CMS space for device control. A busy concurrent burst can temporarily exceed this until the next send prunes it.
- Polling is every three seconds with backoff on connection errors. Network and Wix response time also affect delivery.

Verification files in this directory contain backend checks, VM-only live message tests, native teacher-window rendering, the student process owner/permissions, and restart/protection checks. No trial messages were sent to physical lab PCs.

The real lab rollout is automatic when existing installers receive the signed update and complete their normal restart cycle. A pending earlier update may need to finish first.
