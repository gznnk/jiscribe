# Changelog

All notable changes to the Jiscribe extension are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-06-08

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
