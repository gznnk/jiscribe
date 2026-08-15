import { mountPluginHarness } from "@jiscribe/canvas-sdk/testing/harness";
import {
	containerPlugin,
	containerToolbarEntry,
} from "@jiscribe/plugin-container-shapes";

mountPluginHarness({
	plugins: [containerPlugin],
	// The container specs reach every container stencil through the category flyout, so
	// the layout only needs that entry. The rect preset is kept because
	// CanvasDriver.goto() waits for the "Rectangle" tool button.
	toolbarLayout: [{ kind: "preset", presetId: "rect" }, containerToolbarEntry],
});
