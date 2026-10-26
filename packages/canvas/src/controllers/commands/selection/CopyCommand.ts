import { isTransformedFrame } from "@jiscribe/geometry";
import type { Point } from "@jiscribe/geometry";

import type { ClipboardData } from "./ClipboardData";
import type { CanvasControllerState } from "../../CanvasTypes";
import { collectSelectionSubset } from "../../selection/readers/collectSelectionSubset";
import { getSelectedConnectorId } from "../../selection/readers/getSelectedConnectorId";
import type { ExecutableCommand } from "../CommandTypes";

/** The selection's center for ClipboardData's `center`: the multiSelectGroup's, else the first object's frame's, else the origin. */
const resolveClipboardCenter = (state: CanvasControllerState): Point => {
	if (state.multiSelectGroup != null) {
		return { x: state.multiSelectGroup.cx, y: state.multiSelectGroup.cy };
	}
	const firstObj = state.objects[state.selection.objectIds[0]];
	if (firstObj && isTransformedFrame(firstObj)) {
		return { x: firstObj.cx, y: firstObj.cy };
	}
	return { x: 0, y: 0 };
};

/**
 * Command that copies the current selection (including descendants and fully
 * enclosed connectors) into the internal clipboard, preserving z-order.
 */
export const CopyCommand: ExecutableCommand = {
	id: "copy",
	label: { en: "Copy", ja: "コピー" },
	category: "edit",
	shortcuts: {
		mac: [{ code: "KeyC", meta: true }],
		win: [{ code: "KeyC", ctrl: true }],
		default: [{ code: "KeyC", ctrl: true }],
	},

	// Not offered for a lone connector: a connector is copied as part of the
	// shapes it runs between (collectConnectorsAttachedToSelection), never on its
	// own.
	canExecute: (state) =>
		state.selection.objectIds.length > 0 &&
		getSelectedConnectorId(state) === null,

	execute: (state) => {
		// Connectors come along only when attached to the selection (same test as DuplicateCommand)
		const subset = collectSelectionSubset(
			state.selection.objectIds,
			state.objects,
			state.rootIds,
		);

		const objects: ClipboardData["objects"] = {};
		for (const id of subset.objectIds) {
			const obj = state.objects[id];
			if (obj) {
				objects[id] = obj;
			}
		}

		const data: ClipboardData = {
			__type: "jiscribe-canvas-clipboard",
			version: 1,
			objects,
			// Back to front: on paste the elements are stacked to the front in this
			// order, preserving their relative stacking.
			rootIds: subset.rootIds,
			center: resolveClipboardCenter(state),
		};

		return { ...state, internalClipboard: data };
	},
};
