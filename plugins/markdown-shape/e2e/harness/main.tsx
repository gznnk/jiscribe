import { mountPluginHarness } from "@jiscribe/canvas-sdk/testing/harness";
import { markdownPlugin } from "@jiscribe/plugin-markdown-shape";
import "katex/dist/katex.min.css";

// Math is rendered by KaTeX, whose stylesheet the host has to load (see markdownPlugin).
// The `.katex` elements the math spec asserts on exist without it, but the harness stays a
// faithful host so an eyeball run through `dev:harness` shows the same output as an app.
mountPluginHarness({
	plugins: [markdownPlugin],
	// The rect preset is core's; it is here because CanvasDriver.goto() waits for the
	// "Rectangle" tool. The markdown preset comes from this package's own stencils and is
	// the "Markdown" tool button the specs draw with.
	toolbarLayout: [
		{ kind: "preset", presetId: "rect" },
		{ kind: "preset", presetId: "markdown" },
	],
});
