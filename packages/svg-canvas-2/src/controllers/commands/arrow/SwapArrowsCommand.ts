import type { ConnectorState } from "../../../states/objects/connections/connector/ConnectorState";
import type { PolylineState } from "../../../states/objects/primitives/polyline/PolylineState";
import type { Command } from "../CommandTypes";

export const SwapArrowsCommand: Command = {
	id: "swapArrows",
	label: "Swap Arrows",
	category: "edit",

	canExecute: (state) => {
		if (state.selectedConnectorId !== null) {
			return state.objects[state.selectedConnectorId]?.type === "connector";
		}
		return state.selectedIds.some(
			(id) => state.objects[id]?.type === "polyline",
		);
	},

	execute: (state) => {
		// Connector 選択時
		if (state.selectedIds.length === 0 && state.selectedConnectorId !== null) {
			const connector = state.objects[state.selectedConnectorId] as
				| ConnectorState
				| undefined;
			if (!connector) return state;
			const prev = connector.startArrow ?? "None";
			const next = connector.endArrow ?? "None";
			return {
				...state,
				objects: {
					...state.objects,
					[state.selectedConnectorId]: {
						...connector,
						startArrow: next,
						endArrow: prev,
					} as ConnectorState,
				},
				lastCommitTime: Date.now(),
			};
		}

		// Polyline 選択時
		const updatedObjects = { ...state.objects };
		let changed = false;

		for (const id of state.selectedIds) {
			const obj = state.objects[id];
			if (!obj) continue;

			if (obj.type === "polyline") {
				const polyline = obj as PolylineState;
				const prev = polyline.startArrow ?? "None";
				const next = polyline.endArrow ?? "None";
				updatedObjects[id] = {
					...polyline,
					startArrow: next,
					endArrow: prev,
				} as PolylineState;
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
