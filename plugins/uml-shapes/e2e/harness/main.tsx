import { mountPluginHarness } from "@jiscribe/canvas-sdk/testing/harness";
import { umlPlugin, umlToolbarEntry } from "@jiscribe/plugin-uml-shapes";

mountPluginHarness({
	plugins: [umlPlugin],
	// The uml specs reach every record stencil through the category flyout, so the
	// layout only needs that entry. The rect preset is kept because CanvasDriver.goto()
	// waits for the "Rectangle" tool button.
	toolbarLayout: [{ kind: "preset", presetId: "rect" }, umlToolbarEntry],
});
