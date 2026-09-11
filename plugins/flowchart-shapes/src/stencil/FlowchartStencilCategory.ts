import type { StencilCategory } from "@jiscribe/canvas";

import { DiamondIcon } from "./DiamondIcon";

/**
 * Stencil category for the flowchart shapes. The flowchart category is not
 * in core's default bar (plugin-supplied), so a host composes this into its
 * `stencilLibrary.sections` (a sidebar section) or, as a `{ type: "stencilCategory",
 * category }` item, into its `toolbar.sections` (a flyout).
 * `process` / `onPageConnector` stay core presets (rect / ellipse stencils),
 * referenced here by presetId.
 */
export const flowchartStencilCategory: StencilCategory = {
	id: "flowchart",
	label: { en: "Flowchart", ja: "フローチャート" },
	icon: DiamondIcon,
	presetIds: [
		"process",
		"diamond",
		"stadium",
		"subroutine",
		"parallelogram",
		"document",
		"multiDocument",
		"db",
		"storedData",
		"display",
		"manualInput",
		"card",
		"trapezoid",
		"hexagon",
		"delay",
		"loopLimit",
		"extract",
		"cross",
		"onPageConnector",
		"offPageConnector",
	],
};
