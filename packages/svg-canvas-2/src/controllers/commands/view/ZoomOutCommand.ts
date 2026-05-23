import { roundToDecimal } from "@workspace/geometry";

import { PRECISION } from "../../../constants/precision";
import { ZOOM } from "../../../constants/zoom";
import type { Command } from "../CommandTypes";

export const ZoomOutCommand: Command = {
	id: "zoomOut",
	label: "Zoom Out",
	category: "view",
	shortcuts: {
		mac: [{ code: "Minus", meta: true }],
		win: [{ code: "Minus", ctrl: true }],
		default: [{ code: "Minus", ctrl: true }],
	},

	canExecute: (state) => state.viewport.zoom > ZOOM.MIN,

	execute: (state) => {
		const { viewport } = state;
		const newZoom = Math.max(ZOOM.MIN, viewport.zoom * ZOOM.OUT_FACTOR);

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
