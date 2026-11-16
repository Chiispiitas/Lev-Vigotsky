# UEPLV Veyon Master plugin

Targets the API in Veyon tag `v4.10.2`, commit `b192e522f6524de7f3838e4660565c9246f000bf`.

The plugin adds five native feature actions. Veyon itself includes those actions in the main toolbar and the computer context menu. No component needs installing on student PCs: the teacher-side bridge dispatches through the existing management service.

Build requirements: 64-bit MinGW compiler, matching Qt 6 development headers/import libraries (Core, Gui, Widgets, Network), and an import library for the installed `veyon-core.dll`. Do not replace the installed Veyon Qt runtime with the development runtime.

```powershell
cmake -S . -B build -G Ninja -DCMAKE_BUILD_TYPE=Release -DCMAKE_PREFIX_PATH=C:/path/to/qt -DVEYON_IMPORT_LIBRARY=C:/path/to/libveyon-core.dll.a
cmake --build build
ctest --test-dir build --output-on-failure
```

Teacher bridge contract:

```text
%ProgramData%\UEPLV\VeyonIntegration\UEPLV.VeyonBridge.exe --action class --targets UEPLV-01,UEPLV-02
```

Allowed plugin actions: `class`, `class-ai`, `exam`, `free`, `close-apps`. Native Veyon shutdown and restart remain available. The bridge performs authentication, reports results, and owns the close-applications confirmation. It receives explicit canonical device names; it must never expand an empty/malformed target set to all computers.

On Master startup, `%LOCALAPPDATA%\UEPLV\VeyonIntegration\plugin-status.json` records the loaded runtime/version, five declared feature IDs, five actual lab toolbar buttons, and visibility of the four hidden original buttons. This is runtime integration evidence, not visual review of the screen.

Upstream code used:

- `core/src/FeatureProviderInterface.h`: native feature plugin API.
- `master/src/MainWindow.cpp`: creates toolbar buttons from feature definitions.
- `master/src/ComputerMonitoringWidget.cpp`: builds computer context menu from the same definitions.
- `core/src/PluginManager.cpp`: loads plugins from the application plugin directory.
- `master/src/VeyonMaster.cpp`: toolbar actions operate on currently displayed computers; context-menu actions use selected computers.

The plugin only hides toolbar widget actions named `Demo`, `RemoteView`, `RemoteControl`, and `PowerOn`. It does not disable their underlying native features, so remote view/control remain in computer context menus. Native keys, access rules, directory configuration, and student services remain managed by the existing Veyon installation.
