# Changelog

All notable changes to the Jiscribe extension are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
