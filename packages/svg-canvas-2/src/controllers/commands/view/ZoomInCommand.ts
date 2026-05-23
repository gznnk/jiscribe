import { roundToDecimal } from "@workspace/geometry";

import { PRECISION } from "../../../constants/precision";
import { ZOOM } from "../../../constants/zoom";
import type { Command } from "../CommandTypes";

export const ZoomInCommand: Command = {
	id: "zoomIn",
	label: "Zoom In",
	category: "view",
	shortcuts: {
		mac: [
			{ code: "Equal", meta: true },     // US/EU: Cmd+=
			{ code: "Semicolon", meta: true }, // JIS: Cmd+;
			{ key: "+", meta: true },          // 任意レイアウト: Shift+「+になるキー」
		],
		win: [
			{ code: "Equal", ctrl: true },
			{ code: "Semicolon", ctrl: true },
			{ key: "+", ctrl: true },
		],
		default: [
			{ code: "Equal", ctrl: true },
			{ code: "Semicolon", ctrl: true },
			{ key: "+", ctrl: true },
		],
	},

	canExecute: (state) => state.viewport.zoom < ZOOM.MAX,

	execute: (state) => {
		const { viewport } = state;
		const newZoom = Math.min(ZOOM.MAX, viewport.zoom * ZOOM.IN_FACTOR);

		const centerX = viewport.minX + viewport.width / (2 * viewport.zoom);
		const centerY = viewport.minY + viewport.height / (2 * viewport.zoom);
		const newMinX = centerX - viewport.width / (2 * newZoom);
		const newMinY = centerY - viewport.height / (2 * newZoom);

		return {
			...state,
			viewport: {
				...viewport,
				zoom: roundToDecimal(newZoom, PRECISION.ZOOM),
				minX: roundToDecimal(newMinX, PRECISION.COORDINATE),
				minY: roundToDecimal(newMinY, PRECISION.COORDINATE),
			},
		};
	},
};
