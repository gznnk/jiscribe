import type { ToolbarEntry } from "@jiscribe/canvas";

import { DiamondIcon } from "./DiamondIcon";

/**
 * Toolbar category entry for the flowchart shapes. The flowchart category is not
 * in the core default layout (plugin-supplied), so a host composes this into its
 * `toolbar.layout` where it wants the flyout to appear. `process` /
 * `onPageConnector` stay core presets (rect / ellipse stencils), referenced here
 * by presetId.
 */
export const flowchartToolbarEntry: ToolbarEntry = {
	kind: "category",
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
