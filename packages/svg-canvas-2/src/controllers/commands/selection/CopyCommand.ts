import { isTransformedFrame } from "@workspace/geometry";

import { buildSelectedIdsWithDescendants } from "../../utils/buildSelectedIdsWithDescendants";
import type { Command } from "../CommandTypes";
import type { ClipboardData } from "./ClipboardData";
import { selectConnectorsInSelection } from "./utils/selectConnectorsInSelection";

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

		// 両端点が選択範囲内のコネクターのみコピー（DuplicateCommand と同じ判定）
		const connectorIds = selectConnectorsInSelection(
			state.connectorIds,
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

		const data: ClipboardData = {
			__type: "jiscribe-canvas-clipboard",
			version: 1,
			objects,
			rootIds: [...state.selectedIds],
			connectorIds,
			center,
		};

		return { ...state, internalClipboard: data };
	},
};
