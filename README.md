# MTC Custom Loadout Manager

**English** | [Русский](README.ru.md)

A local loadout editor for **Multicrew Tank Combat (MTC)** and **Rainy Valley (RV)** on Roblox. Assign vehicles and weapons to teams and tiers, configure limits, save loadouts, and export game configuration files as JSON.

Once downloaded, the editor works offline. No Roblox login, tokens, or private server access are needed to run it.

This project is based on the published browser build of [Loadout Editor](https://loadout-editor.multicrew.dev/), extended with a local server, file imports, multi-item copying, and vehicle information cards. It is an independent modification of a local snapshot, not an official MTC release.

## Features

- Edit vehicles and weapons in the **Vehicles** and **Weapons** tabs.
- Organize team columns, the **Shared** list, tiers, and numeric limits.
- Start from six built-in presets: Modern, Cold War, and WW2 for MTC and RV.
- Import JSON files, save loadouts in your browser, export configurations, and create share links.
- Select multiple items with **Shift + left click** and copy them by dragging.
- Hover over vehicles to view images, in-game stats, armament, and available descriptions.
- Browse modifications, including costs, eras, explanations, and published stat changes.

## Requirements

- **Node.js 20 or newer** — [official Node.js website](https://nodejs.org/).
- A modern browser with `DecompressionStream` support to open share links.

The application files are already included in the repository. There is no need to run `npm install` or build Next.js.

## Quick start

1. Download the repository using **Code → Download ZIP** and extract it, or clone it with Git.
2. Open the folder containing `package.json`, `server.mjs`, and `Start.cmd`.
3. Start the application using one of the methods below.

### Windows

Double-click **`Start.cmd`**. It checks for Node.js, opens your browser, and starts the local server.

If the browser opens before the server is ready, refresh the page once the server address appears in the terminal.

### Terminal — Windows, Linux, and macOS

Open a terminal in the project folder and run:

```sh
npm start
```

Alternatively, start the server directly:

```sh
node server.mjs
```

Open **[http://localhost:4173](http://localhost:4173)**. Keep the terminal window open while using the editor. Press **Ctrl+C** to stop the server.

Do not open `public/index.html` by double-clicking it: the application uses a local HTTP server.

## Usage

### Load a built-in preset

1. Open **Manage**.
2. Click **Select** next to the preset you want.
3. Click **Import loadout**.
4. Switch to **Vehicles** or **Weapons** to edit the loadout.

### Edit and copy items

Drag items from the list on the right into the appropriate team and tier cell. Click an item in a column to open its settings.

To copy multiple items:

1. Hold **Shift** and click items in the columns. Selected items have an orange outline.
2. Drag one of the selected items into the destination cell.
3. The items are copied; the originals stay in their source cells.

**Shift + left click** again to deselect an item, or press **Esc** to clear the selection. A matching item in the destination cell is replaced. Dragging between tiers within the same cell moves the item. Without a multi-item selection, dragging performs a normal move.

### Import your own JSON

In **Manage**, click **Import from file** and select one or more files. Supported formats:

- Editor presets with `columns` and `items`, including `*.editor.json`.
- Game exports with `WeaponClasses` and `Vehicles`.

Imported files appear in the saved loadout list. Click **Select**, then **Import loadout**, to open one. Game exports are converted to the editor structure while preserving teams, shared lists, tiers, and numeric limits.

Import limits: **4 MiB per file**, up to **20 files at once**, **64 columns**, and **20,000 items** per loadout. Invalid files are rejected with an error message.

### Save, export, and share

The **Manage** tab provides these actions:

| Action | Result |
| --- | --- |
| **Save as** | Saves the current loadout under the given name in your browser. |
| **Download loadout JSON** | Downloads a game configuration as JSON. |
| **Copy loadout JSON** | Copies the game configuration to the clipboard. |
| **Copy share link** | Creates a link containing the configuration. |

Downloaded JSON can be imported again using **Import from file**. Applying a configuration in Roblox is a separate step handled through the game. The editor does not connect to a game server or change its settings.

**Saved loadouts are stored in your browser's localStorage.** Use the same browser and address: `localhost:4173`, `127.0.0.1:4173`, and other ports have separate storage. Clearing site data or switching browser profiles can remove access to your saves. Download JSON files for backups.

Share links created locally contain `localhost`. The recipient needs to run their own copy of the editor and open the link using that copy's address, preserving the `#share=…` fragment. Do not publish links containing configurations you want to keep private.

### Vehicle images, stats, and modifications

Hover over a vehicle in the list on the right or in a team column. Its card opens after a short delay. Move the pointer onto the card to scroll its contents. Press **Esc** to close it. Cards also open when a vehicle receives keyboard focus.

Use **MTC / RV** to switch between available data versions. Some vehicles also have an era selector. In the **Modifications (Модификации)** tab, click a modification name to expand its cost, explanation, and changes.

Stats describe the in-game base configuration. Missing values are not filled in with guesses. Modification explanations identify their source: an in-game description, published module changes, or an interpretation of the name. **Viewing modifications does not apply them to the exported JSON.**

Vehicle card labels and modification explanations are currently in Russian. Original descriptions retain their source language.

## Data and limitations

The editor contains **384 vehicle entries and 58 weapon entries**. As of October 24, 2026, game data is available for **383 vehicle entries**, and images for **379**. This includes 46 previously missing thumbnails captured from the MTC Dev Tank Spawner.

In-game stats come from published [Multicrew Wiki](https://multicrew.wiki/) data. Images and data are stored locally; normal editor use does not request them from Roblox or the wiki. Updates are manual, so values may differ from the current game version.

See [missing-vehicle-images.txt](verification/missing-vehicle-images.txt) for missing images. The old `GTK Boxer` ID also lacks game stats; the FLW 200 variant is not substituted for it.

The original React/TypeScript source files and a complete dependency list are not available. This repository contains the published browser build and additional scripts.

## Development and maintenance commands

Run all commands from the project folder.

| Command | Purpose |
| --- | --- |
| `npm start` | Start the local server. |
| `npm test` | Check imports, share links, copying, and server protections. |
| `npm run check:vehicles` | Validate the catalog, images, and consistency with source data. |
| `npm run scan:secrets` | Scan for known token/key formats and literal passwords. |
| `npm run sync:vehicles -- --offline` | Rebuild the catalog from cached data without internet access. |
| `npm run sync:vehicles` | Update available wiki data and images using the cache. |
| `npm run sync:vehicles -- --refresh` | Fetch vehicle stats and images from the wiki again. |
| `npm run patch` | Reapply modifications to the saved upstream browser build. |
| `npm run prepare:release` | Prepare a separate folder for publication. |

Wiki updates require internet access. Verified spawner thumbnails are preserved using the mappings in `config/vehicle-images.json`.

`prepare:release` creates a sibling folder named `github-upload` and a SHA-256 manifest. It does not overwrite an existing folder. To choose a new destination:

```sh
npm run prepare:release -- ../github-upload-next
```

The script does not create a remote repository or upload anything to GitHub. Local session screenshots, browser profiles, user saves, and backup files are excluded from the package.

## Project structure

```text
public/                     Browser build, images, and vehicle catalog
config/vehicle-images.json  Spawner thumbnail mappings to game IDs
server.mjs                  Local HTTP server with no npm dependencies
Start.cmd                   Windows launcher
tools/                      Data sync, patches, and packaging scripts
tools/upstream/             Saved upstream build used for patching
tests/                      Security and behavior checks
verification/               Source data, reports, and missing image list
.github/workflows/          GitHub Actions checks
```

## Troubleshooting

**`node` or `npm` is not found.** Install Node.js, then reopen your terminal. Check the installation with `node --version`.

**Port 4173 is busy (`EADDRINUSE`).** If the editor is already running, open its existing address. To use a different port in PowerShell:

```powershell
$env:PORT = '4174'
node server.mjs
```

On Linux or macOS:

```sh
PORT=4174 node server.mjs
```

Then open `http://localhost:4174`. Saves from the previous port are not transferred automatically.

**An image or some stats are missing.** Check the [missing image list](verification/missing-vehicle-images.txt) and run `npm run check:vehicles`. Make sure `public/data` and `public/assets/vehicles` were copied in full.

**A share link does not open.** Check your local address and port, the integrity of the `#share=…` fragment, and your browser's `DecompressionStream` support. You can also exchange JSON files.

**The old interface appears after an update.** Force-refresh the page: **Ctrl+F5** on Windows/Linux or **Cmd+Shift+R** on macOS.

## Security and attribution

By default, the server is accessible only on your computer (`127.0.0.1`). Imports have schema and size checks, share-link decompression is bounded, and the server sends protective HTTP headers. See [SECURITY.md](SECURITY.md) for findings and limitations of the third-party build review. The secret scanner cannot guarantee detection of arbitrary passwords.

See [NOTICE.md](NOTICE.md) for the origins of the interface, game data, images, and applicable distribution terms. The wiki data license does not automatically cover the entire application or images captured directly from the game.
