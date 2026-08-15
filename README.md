# Fortnite UAsset Backport Editor

This is a first MVP of the requested Windows-focused backport editor. It is intentionally conservative: it reads `.uasset` metadata, shows name/import/export/reference data, compares source and target assets, validates dependency presence, and only writes changes that can be made without changing binary layout.

The app does not pretend to be a full Unreal version converter. It keeps the old target asset as the structural base and can patch compatible reference strings into a working copy.

## Start The App

Double-click:

```text
Start Backport Editor.cmd
```

The app opens as its own local desktop window, without a normal browser tab. The launcher starts the local background server and then closes itself.

Optional desktop shortcut:

```text
Create Desktop Shortcut.cmd
```

To stop the background server:

```text
Stop Backport Editor.cmd
```

Advanced/manual start:

```powershell
npm run desktop
```

## MVP Capabilities

- Select source and target season directories.
- Scan `.uasset`, `.uexp`, and `.ubulk` files with Item/Weapon-focused browser filters.
- Parse Unreal package summary, name map, imports, exports, and likely `/Game/...` references.
- Group properties/references dynamically from discovered package data in AssetEditor-style grids.
- Provide an Item Backport Assistant for selecting item components before applying changes.
- Compare a target asset with a source asset.
- Replace a target reference with a source reference only when it is length-compatible and can be patched in-place.
- Create backups before save.
- Package selected assets plus sidecar `.uexp`/`.ubulk` files into an `Output/Game/...` tree.
- Validate missing references, sidecars, parse safety, and unsupported edit cases.

## Serialization Boundary

Full lossless UAsset property serialization should be delegated to a proven library such as UAssetAPI, which is the core used by UAssetGUI. This MVP includes `src/Serialization/UAssetBinaryParser.js` and `src/Serialization/UAssetBinaryWriter.js` as a safe bridge until UAssetAPI or another full serializer is wired into the project.

Unsafe edits are rejected instead of producing probably-broken assets.

## AssetEditor Reference Notes

The provided `AssetEditor.exe` was inspected statically, not executed. It appears to be a .NET/WPF app named `AssetEditor` with `AssetParser.dll` references and UI concepts such as `PackageViewer`, `PropertyGrid`, `ReferenceGrid`, `ClassGrid`, `Import Sub`, `Export Sub`, and `Package Folder`. This MVP mirrors those concepts in the browser/editor layout while keeping Fortnite item backporting as the main workflow.
