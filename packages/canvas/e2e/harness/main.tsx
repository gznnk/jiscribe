// Relative, never through @jiscribe/canvas-sdk: canvas may not depend on the kit it ships.
import {
	specShapesPlugin,
	specShapesToolbarEntry,
} from "../plugins/specShapesPlugin";
import { mountPluginHarness } from "../testing-harness";

// Core owns seven primitive types; everything richer lives in plugins, so the specs that
// need a category, a click-placed type, a <g>-rooted render or a text slot get them from
// specShapesPlugin — a test-only stand-in this package defines, not a shipped plugin.
// No shipped plugin is registered here: each one owns its e2e suite, and the seven
// mounted together are covered by apps/canvas-examples.
mountPluginHarness({
	plugins: [specShapesPlugin],
	toolbarLayout: [
		{ kind: "preset", presetId: "rect" },
		{ kind: "preset", presetId: "ellipse" },
		{ kind: "preset", presetId: "polyline" },
		{ kind: "preset", presetId: "polygon" },
		{ kind: "preset", presetId: "text" },
		{ kind: "preset", presetId: "pin" },
		{ kind: "preset", presetId: "card" },
		specShapesToolbarEntry,
	],
});
