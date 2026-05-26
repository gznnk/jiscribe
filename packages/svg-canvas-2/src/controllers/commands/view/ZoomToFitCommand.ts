import {
	calcBoundingBox,
	calcPolyBoundingBox,
	isTransformedFrame,
	roundToDecimal,
} from "@workspace/geometry";

import { PRECISION } from "../../../constants/precision";
import { ZOOM } from "../../../constants/zoom";
import { isPoly } from "../../../schemas/objects/types/Poly";
import type { Command } from "../CommandTypes";

const PADDING_PX = 48;

export const ZoomToFitCommand: Command = {
	id: "zoomToFit",
	label: "Zoom to Fit",
	category: "view",
	shortcuts: {
		mac: [{ code: "Digit0", meta: true }],
		win: [{ code: "Digit0", ctrl: true }],
		default: [{ code: "Digit0", ctrl: true }],
	},

	canExecute: (state) => Object.keys(state.objects).length > 0,

	execute: (state) => {
		const { viewport } = state;

		let minX = Infinity,
			maxX = -Infinity,
			minY = Infinity,
			maxY = -Infinity;

		for (const obj of Object.values(state.objects)) {
			if (!obj || obj.type === "group") {
				continue;
			}

			if (isTransformedFrame(obj)) {
				const bbox = calcBoundingBox(obj);
				minX = Math.min(minX, bbox.left);
				maxX = Math.max(maxX, bbox.right);
				minY = Math.min(minY, bbox.top);
				maxY = Math.max(maxY, bbox.bottom);
			} else if (isPoly(obj)) {
				const bbox = calcPolyBoundingBox(obj.points);
				if (bbox) {
					minX = Math.min(minX, bbox.left);
					maxX = Math.max(maxX, bbox.right);
					minY = Math.min(minY, bbox.top);
					maxY = Math.max(maxY, bbox.bottom);
				}
			}
		}

		if (!isFinite(minX)) {
			return state;
		}

		const contentWidth = maxX - minX;
		const contentHeight = maxY - minY;
		const contentCx = (minX + maxX) / 2;
		const contentCy = (minY + maxY) / 2;

		const availableW = viewport.width - 2 * PADDING_PX;
		const availableH = viewport.height - 2 * PADDING_PX;

		let newZoom =
			contentWidth > 0 && contentHeight > 0
				? Math.min(availableW / contentWidth, availableH / contentHeight)
				: 1;
		newZoom = Math.max(ZOOM.MIN, Math.min(ZOOM.MAX, newZoom));

		const newMinX = contentCx - viewport.width / (2 * newZoom);
		const newMinY = contentCy - viewport.height / (2 * newZoom);

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
