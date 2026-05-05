import type { ConnectorState } from "../../../states/objects/connections/connector/ConnectorState";
import type { PolylineState } from "../../../states/objects/primitives/polyline/PolylineState";
import type { Command } from "../CommandTypes";

export const SwapArrowsCommand: Command = {
	id: "swapArrows",
	label: "矢印を入れ替え",
	category: "edit",

	canExecute: (state) => {
		return state.selectedIds.some((id) => {
			const type = state.objects[id]?.type;
			return type === "polyline" || type === "connector";
		});
	},

	execute: (state) => {
		const updatedObjects = { ...state.objects };
		let changed = false;

		for (const id of state.selectedIds) {
			const obj = state.objects[id];
			if (!obj) continue;

			if (obj.type === "polyline") {
				const polyline = obj as PolylineState;
				const prev = polyline.startArrow ?? "None";
				const next = polyline.endArrow ?? "None";
				updatedObjects[id] = { ...polyline, startArrow: next, endArrow: prev } as PolylineState;
				changed = true;
			} else if (obj.type === "connector") {
				const connector = obj as ConnectorState;
				const prev = connector.startArrow ?? "None";
				const next = connector.endArrow ?? "None";
				updatedObjects[id] = { ...connector, startArrow: next, endArrow: prev } as ConnectorState;
				changed = true;
			}
		}

		if (!changed) return state;
		return {
			...state,
			objects: updatedObjects,
			lastCommitTime: Date.now(),
		};
	},
};
