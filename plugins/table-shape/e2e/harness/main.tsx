import { basicStencilCategory } from "@jiscribe/canvas";
import { mountPluginHarness } from "@jiscribe/canvas-sdk/testing/harness";
import { tablePlugin } from "@jiscribe/plugin-table-shape";

// This package's shapes only, so a spec failing here is this package's own fault.
mountPluginHarness({
	plugins: [tablePlugin],
	// The rect preset is core's; it is here because CanvasDriver.goto() waits for the
	// "Rectangle" tool. The table preset comes from this package's own stencils and is the
	// "Table" tool button every spec places with; the table contributes no category, so a
	// preset entry is all it needs.
	toolbarItems: [
		{ type: "stencilPreset", presetId: "rect" },
		{ type: "stencilPreset", presetId: "table" },
	],
	// The sidebar as well, because the table is the first shape whose box is measured
	// rather than stored: dragging one out of the library is where the ghost and the
	// drop have to agree on where it lands (table-library-drag.spec).
	stencilLibrarySections: [
		{
			...basicStencilCategory,
			presetIds: [...basicStencilCategory.presetIds, "table"],
		},
	],
});
