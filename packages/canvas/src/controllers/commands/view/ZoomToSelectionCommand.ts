import {
	calcBoundingBox,
	calcPolyBoundingBox,
	isTransformedFrame,
	roundToDecimal,
} from "@workspace/geometry";

import { PRECISION } from "../../../constants/precision";
import { ZOOM } from "../../../constants/zoom";
import { isPoly } from "../../../schemas/objects/types/Poly";
import { buildSelectedIdsWithDescendants } from "../../utils/buildSelectedIdsWithDescendants";
import type { Command } from "../CommandTypes";

const PADDING_PX = 48;

export const ZoomToSelectionCommand: Command = {
	id: "zoomToSelection",
	label: "Zoom to Selection",
	category: "view",
	shortcuts: {
		mac: [{ code: "Digit2", meta: true }],
		win: [{ code: "Digit2", ctrl: true }],
		default: [{ code: "Digit2", ctrl: true }],
	},

	canExecute: (state) => state.selectedIds.length > 0,

	execute: (state) => {
		const { viewport } = state;

		const targetIds = buildSelectedIdsWithDescendants(
			state.selectedIds,
			state.objects,
		);

		let minX = Infinity,
			maxX = -Infinity,
			minY = Infinity,
			maxY = -Infinity;

		for (const id of targetIds) {
			const obj = state.objects[id];
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

		// 幅・高さを個別に候補化し、有効な軸（サイズ > 0）だけでフィット倍率を取る。
		// こうすることで水平/垂直な直線（片軸サイズが 0）でも軸方向にフィットできる
		// （ZoomToFit と同じ算出ロジック）。
		const zoomCandidates = [
			contentWidth > 0 ? availableW / contentWidth : null,
			contentHeight > 0 ? availableH / contentHeight : null,
		].filter((v): v is number => v !== null);
		let newZoom = zoomCandidates.length > 0 ? Math.min(...zoomCandidates) : 1;
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
