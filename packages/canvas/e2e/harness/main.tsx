// Relative, never through @jiscribe/canvas-sdk: canvas may not depend on the kit it ships.
import type { StencilCategory } from "../../src";
import { basicStencilCategory } from "../../src";
import {
	specShapesPlugin,
	specShapesStencilCategory,
} from "../plugins/specShapesPlugin";
import { mountPluginHarness } from "../testing-harness";

// Core owns eight primitive types; everything richer lives in plugins, so the specs that
// need a category, a click-placed type, a <g>-rooted render or a text slot get them from
// specShapesPlugin — a test-only stand-in this package defines, not a shipped plugin.
// No shipped plugin is registered here: each one owns its e2e suite, and the seven
// mounted together are covered by apps/canvas-examples.

// The shape library sidebar needs host-declared `stencilLibrarySections` to exist at all,
// and the toolbar toggle the kit puts at the end of the tools shows only once a section
// resolves. Core's primitives and the same test-only category are enough, so the specs have
// both a section of shapes and a category living on the bar and in the sidebar at once.
const librarySections: StencilCategory[] = [
	basicStencilCategory,
	specShapesStencilCategory,
];

// A 1x1 transparent PNG, the smallest file an <image> can actually draw. The
// page resolves exactly one name and rejects everything else, so a spec can put
// both halves of the contract — a file that arrives and one that does not — on
// one canvas.
const OK_IMAGE_SRC = "ok.png";
const OK_IMAGE_BYTES =
	"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGP4z8AAAAMBAQDuFqDsAAAAAElFTkSuQmCC";

const resolveHarnessImage = async (src: string): Promise<Blob> => {
	if (src !== OK_IMAGE_SRC) {
		throw new Error(`no such image: ${src}`);
	}
	const response = await fetch(`data:image/png;base64,${OK_IMAGE_BYTES}`);
	return response.blob();
};

mountPluginHarness({
	plugins: [specShapesPlugin],
	resolveImage: resolveHarnessImage,
	toolbarItems: [
		{ type: "stencilPreset", presetId: "rect" },
		{ type: "stencilPreset", presetId: "ellipse" },
		{ type: "stencilPreset", presetId: "polyline" },
		{ type: "stencilPreset", presetId: "polygon" },
		{ type: "stencilPreset", presetId: "text" },
		{ type: "stencilPreset", presetId: "pin" },
		{ type: "stencilPreset", presetId: "card" },
		{ type: "stencilPreset", presetId: "memo" },
		{ type: "stencilCategory", category: specShapesStencilCategory },
	],
	stencilLibrarySections: librarySections,
});
