import { PRECISION } from "@jiscribe/doc/model/objects/utils/precision";
import { roundToDecimal } from "@jiscribe/geometry";

import { ZOOM, stepZoomOut } from "../../../constants/zoom";
import type { ExecutableCommand } from "../CommandTypes";

export const ZoomOutCommand: ExecutableCommand = {
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
		const newZoom = stepZoomOut(viewport.zoom);

		const centerX = viewport.minX + viewport.width / (2 * viewport.zoom);
		const centerY = viewport.minY + viewport.height / (2 * viewport.zoom);
		const newMinX = centerX - viewport.width / (2 * newZoom);
		const newMinY = centerY - viewport.height / (2 * newZoom);

		return {
			...state,
			viewport: {
				...viewport,
				zoom: roundToDecimal(newZoom, ZOOM.PRECISION),
				minX: roundToDecimal(newMinX, PRECISION.COORDINATE),
				minY: roundToDecimal(newMinY, PRECISION.COORDINATE),
			},
		};
	},
};
