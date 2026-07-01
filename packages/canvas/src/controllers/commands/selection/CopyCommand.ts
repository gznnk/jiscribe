import { isTransformedFrame } from "@workspace/geometry";

import type { ClipboardData } from "./ClipboardData";
import { selectConnectorsInSelection } from "./utils/selectConnectorsInSelection";
import { buildSelectedIdsWithDescendants } from "../../utils/buildSelectedIdsWithDescendants";
import { getRootConnectorIds } from "../../utils/getRootConnectorIds";
import { sortObjectIdsByZOrder } from "../../utils/sortObjectIdsByZOrder";
import type { Command } from "../CommandTypes";

/**
 * Command that copies the current selection (including descendants and fully
 * enclosed connectors) into the internal clipboard, preserving z-order.
 */
export const CopyCommand: Command = {
	id: "copy",
	label: "Copy",
	category: "edit",
	shortcuts: {
		mac: [{ code: "KeyC", meta: true }],
		win: [{ code: "KeyC", ctrl: true }],
		default: [{ code: "KeyC", ctrl: true }],
	},

	canExecute: (state) => state.selectedIds.length > 0,

	execute: (state) => {
		const selectedIdsWithDescendants = buildSelectedIdsWithDescendants(
			state.selectedIds,
			state.objects,
		);

		const objects: ClipboardData["objects"] = {};
		for (const id of selectedIdsWithDescendants) {
			const obj = state.objects[id];
			if (obj) {
				objects[id] = obj;
			}
		}

		// Copy only connectors whose both endpoints are within the selection (same test as DuplicateCommand)
		const connectorIds = selectConnectorsInSelection(
			getRootConnectorIds(state.objects, state.rootIds),
			state.objects,
			selectedIdsWithDescendants,
		);
		for (const connId of connectorIds) {
			objects[connId] = state.objects[connId];
		}

		const firstObj = state.objects[state.selectedIds[0]];
		const center =
			state.multiSelectGroup != null
				? { x: state.multiSelectGroup.cx, y: state.multiSelectGroup.cy }
				: firstObj && isTransformedFrame(firstObj)
					? { x: firstObj.cx, y: firstObj.cy }
					: { x: 0, y: 0 };

		// Order the copied top-level elements (objects + connectors) by z-order (back → front)
		// and place them on the clipboard. On paste they are stacked to the front in this order,
		// preserving their relative stacking. Connectors are kept mixed into rootIds rather than a
		// separate array (same representation as state's rootIds).
		const rootIds = sortObjectIdsByZOrder(
			[...state.selectedIds, ...connectorIds],
			state.objects,
			state.rootIds,
		);

		const data: ClipboardData = {
			__type: "jiscribe-canvas-clipboard",
			version: 1,
			objects,
			rootIds,
			center,
		};

		return { ...state, internalClipboard: data };
	},
};
