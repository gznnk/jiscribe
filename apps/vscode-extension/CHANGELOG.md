# Changelog

All notable changes to the Jiscribe extension are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-06-18

### Added

- **Set up AI**: A new command that configures your AI assistant to author Jiscribe diagrams. It places an authoring guide, a reference, and the schema under `.jiscribe/`, and adds a small adapter for each selected agent — **Claude Code**, **Cursor**, and **GitHub Copilot** — so they know how to generate and edit `.jis.json`.

### Changed

- Renamed the **New Empty Jiscribe Canvas** command to **New Jiscribe Canvas**.
- Updated the bundled AI authoring guide and reference for accuracy (default values, text types, sticky notes) and rewrote them in English.

### Removed

- Removed the **Export Jiscribe Canvas Schema** command (superseded by **Set up AI**). The schema is still published at `https://schema.jiscribe.dev/v1/jiscribe.schema.json`.

## [0.1.3] - 2026-06-17

### Added

- **Dark Theme UI**: The canvas UI has been redesigned to follow your VS Code color theme, with a refined dark design across toolbars, menus, and icons.
- **Axis-Locked Movement**: Hold `Shift` while dragging objects or polyline/polygon vertices to constrain movement to the X or Y axis. Viewport-wide guide lines and snapping back to the start position make precise alignment easier.
- **Arrow Key Nudging**: Move the selected objects with the arrow keys. Repeated nudges are grouped into a single undo step.
- **Center Snapping**: Objects now snap to the horizontal and vertical centers (`hCenter` / `vCenter`) of other shapes.
- **Toolbar Zoom**: The zoom `+` / `-` buttons in the toolbar are now wired to the command system.

### Fixed

- **Connectors**: Connector endpoints are now edited directly on the connector for more reliable re-routing.
- **Hollow Arrows**: Removed the white fill from hollow arrowheads, and the line now terminates at the base of the arrow.
- **Context Menu**: Pasting with an empty clipboard no longer leaves the context menu open.
- **Defaults**: New shapes now use a neutral gray for their default stroke and font color.
- Fixed a division-by-zero error when transforming grouped frames, limited hover detection to elements inside the canvas, and made the transparency indicators and shortcut list follow the active theme.

## [0.1.2] - 2026-06-13

### Added

- **Keyboard Shortcuts Help**: Added a new modal pane to view all available keyboard shortcuts. You can open it by pressing `?` or by clicking the `?` button in the bottom right corner of the canvas.
- Improved the Usage section in the README to emphasize command palette and AI generation features.

## [0.1.1] - 2026-06-13

### Fixed

- **TextEditor**: Fixed line-height mismatch between the display layer and the textarea.
- **TextEditor**: Vertical alignment (`verticalAlign`) is now preserved while editing text.
- **TextEditor**: Fixed incorrect `verticalAlign` values in the alignment menu that prevented the TextEditor from opening.
- **TextEditor**: Scrolling the canvas no longer interrupts an active text edit session.
- Various minor bug fixes.

## [0.1.0] - 2026-06-12

First public Beta release.

### Added

- Custom canvas editor for `.jis.json` files, opened automatically in VS Code.
- Two-way sync between the visual canvas and the underlying JSON text editor.
- Canvas primitives: rectangles, ellipses, polylines, and polygons.
- Connectors to link shapes natively.
- Grouping of existing objects.
- JSON Schema integration for auto-completion, served at
  `https://schema.jiscribe.dev/v1/jiscribe.schema.json`.
- Problems panel integration for syntax errors and broken connections.
