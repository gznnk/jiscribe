import { isGroupState } from "../../../states/objects/primitives/group/GroupState";
import { buildSelectedIdsWithDescendants } from "../../utils/buildSelectedIdsWithDescendants";
import { calcObjectBoundingBox } from "../../utils/calcObjectBoundingBox";
import { calcViewportForBounds } from "../../utils/calcViewportForBounds";
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
		let hasValidObject = false;

		for (const id of targetIds) {
			const obj = state.objects[id];
			// Skip groups: targetIds already contains their descendants,
			// so recursing into them would only duplicate work.
			if (!obj || isGroupState(obj)) {
				continue;
			}

			const bbox = calcObjectBoundingBox(obj, state.objects);
			if (!bbox) {
				continue;
			}

			minX = Math.min(minX, bbox.left);
			maxX = Math.max(maxX, bbox.right);
			minY = Math.min(minY, bbox.top);
			maxY = Math.max(maxY, bbox.bottom);
			hasValidObject = true;
		}

		if (!hasValidObject) {
			return state;
		}

		// For degenerate targets with no extent to fit (both axes size 0, e.g. a
		// single-point Poly or a degenerate Frame), calcViewportForBounds returns
		// null; keep the current viewport (consistent with the "no target" no-op guard).
		const fitted = calcViewportForBounds(
			{ left: minX, top: minY, right: maxX, bottom: maxY },
			{
				width: viewport.width,
				height: viewport.height,
				padding: PADDING_PX,
			},
		);
		if (!fitted) {
			return state;
		}

		return {
			...state,
			viewport: {
				...viewport,
				zoom: fitted.zoom,
				minX: fitted.minX,
				minY: fitted.minY,
			},
		};
	},
};
