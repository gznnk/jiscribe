import { PRECISION } from "@jiscribe/doc/model/objects/utils/precision";
import { roundToDecimal } from "@jiscribe/geometry";

import { ZOOM, stepZoomIn } from "../../../constants/zoom";
import type { ExecutableCommand } from "../CommandTypes";

export const ZoomInCommand: ExecutableCommand = {
	id: "zoomIn",
	label: "Zoom In",
	category: "view",
	shortcuts: {
		mac: [
			{ code: "Equal", meta: true }, // US/EU: Cmd+=
			{ code: "Semicolon", meta: true }, // JIS: Cmd+;
			{ key: "+", meta: true }, // Any layout: Shift + "the key that produces +"
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
		const newZoom = stepZoomIn(viewport.zoom);

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
