import type { StencilCategory } from "@jiscribe/canvas";

import { DiamondIcon } from "./DiamondIcon";

/**
 * Stencil category for the flowchart shapes. Plugin-supplied, so a host
 * composes this into its `stencilLibrary.sections`, where the rail's catalog
 * lists it and the user can pin it to the rail.
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
