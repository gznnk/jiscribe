import type { ConnectorState } from "../../../states/objects/connector/ConnectorState";
import type { PolylineState } from "../../../states/objects/primitives/polyline/PolylineState";
import { getSelectedConnectorId } from "../../utils/getSelectedConnectorId";
import type { ExecutableCommand } from "../CommandTypes";

export const SwapArrowsCommand: ExecutableCommand = {
	id: "swapArrows",
	label: { en: "Swap Arrows", ja: "矢印を入れ替え" },
	category: "edit",

	canExecute: (state) => {
		if (getSelectedConnectorId(state) !== null) {
			return true;
		}
		return state.selection.objectIds.some(
			(id) => state.objects[id]?.type === "polyline",
		);
	},

	execute: (state) => {
		// A selected connector is the whole selection, so it answers on its own
		const connectorId = getSelectedConnectorId(state);
		if (connectorId !== null) {
			const connector = state.objects[connectorId] as ConnectorState;
			const prev = connector.startArrow ?? "None";
			const next = connector.endArrow ?? "None";
			return {
				...state,
				objects: {
					...state.objects,
					[connectorId]: {
						...connector,
						startArrow: next,
						endArrow: prev,
					} as ConnectorState,
				},
				commitVersion: state.commitVersion + 1,
			};
		}

		// When polylines are selected
		const updatedObjects = { ...state.objects };
		let changed = false;

		for (const id of state.selection.objectIds) {
			const obj = state.objects[id];
			if (!obj) {
				continue;
			}

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

		if (!changed) {
			return state;
		}
		return {
			...state,
			objects: updatedObjects,
			commitVersion: state.commitVersion + 1,
		};
	},
};
