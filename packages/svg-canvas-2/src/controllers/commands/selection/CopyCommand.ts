import { isTransformedFrame } from "@workspace/geometry";

import type { ClipboardData } from "./ClipboardData";
import type { ConnectorState } from "../../../states/objects/connections/connector/ConnectorState";
import { buildSelectedIdsWithDescendants } from "../../utils/buildSelectedIdsWithDescendants";
import type { Command } from "../CommandTypes";

export const CopyCommand: Command = {
	id: "copy",
	label: "コピー",
	category: "edit",
	shortcuts: {
		mac: [{ key: "c", meta: true }],
		win: [{ key: "c", ctrl: true }],
		default: [{ key: "c", ctrl: true }],
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
			if (obj) objects[id] = obj;
		}

		// Only include connectors whose both endpoints are within the selection
		const connectorIds: string[] = [];
		for (const connId of state.connectorIds) {
			const conn = state.objects[connId] as ConnectorState | undefined;
			if (!conn) continue;
			const sourceOwnerId = conn.source.owner?.id;
			const targetOwnerId = conn.target.owner?.id;
			const sourceOk = !sourceOwnerId || selectedIdsWithDescendants.has(sourceOwnerId);
			const targetOk = !targetOwnerId || selectedIdsWithDescendants.has(targetOwnerId);
			if (sourceOk && targetOk) {
				connectorIds.push(connId);
				objects[connId] = conn;
			}
		}

		const firstObj = state.objects[state.selectedIds[0]];
		const center = state.multiSelectGroup != null
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

		navigator.clipboard.writeText(JSON.stringify(data)).catch(console.error);

		return state;
	},
};
