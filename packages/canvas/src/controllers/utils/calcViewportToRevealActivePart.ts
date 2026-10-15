import { isTransformedFrame } from "@jiscribe/geometry";

import {
	calcCameraToRevealBox,
	FOCUS_REVEAL_PADDING,
} from "./calcCameraToRevealBox";
import { calcTransformedRectBounds } from "./calcTransformedRectBounds";
import type { ObjectPartKindRegistry } from "../../rendering/objects/registry/ObjectPartKindRegistry";
import type { Viewport } from "../../rendering/Viewport";
import type { ObjectState } from "../../states/objects/base/ObjectState";
import type { CanvasSelection } from "../selection/CanvasSelection";
import { readActivePartFocusId } from "../selection/readers/readActivePartFocusId";

/** Whether the two selections name the same active part of the same object. */
const isSameActivePart = (
	previousSelection: CanvasSelection,
	selection: CanvasSelection,
): boolean => {
	const previousPart = previousSelection.part;
	const part = selection.part;
	if (previousPart === null || part === null) {
		return previousPart === part;
	}
	return (
		previousSelection.objectIds[0] === selection.objectIds[0] &&
		previousPart.kind === part.kind &&
		readActivePartFocusId(previousPart) === readActivePartFocusId(part)
	);
};

/**
 * The viewport after a command, panned just far enough to show the part the
 * selection moved to (a table cell stepped to with an arrow key, a slot reached
 * with Tab). Only the active range's focus is revealed, not every part the
 * ranges cover, so a pick extended past the view follows its moving end.
 *
 * @param viewport - The viewport after the command; returned as is (same
 *   reference) when nothing needs to move, including while it is unmeasured
 * @param previousSelection - The selection before the command; a focus that has
 *   not moved, on the same object and part kind, reveals nothing, so a command
 *   leaving the pick alone never pans a view the user scrolled away
 * @param selection - The selection after the command, as reconcileSelection
 *   left it
 * @param objects - The objects after the command, where the part is measured
 * @param objectPartKind - Answers the part's box (ObjectPartKindDefinition.region);
 *   a kind without `region`, or a `region` answering null, reveals nothing
 * @returns The viewport to show; only `minX` / `minY` ever differ from `viewport`
 */
export const calcViewportToRevealActivePart = (
	viewport: Viewport,
	previousSelection: CanvasSelection,
	selection: CanvasSelection,
	objects: Readonly<Record<string, ObjectState>>,
	objectPartKind: Pick<ObjectPartKindRegistry, "get">,
): Viewport => {
	const { part } = selection;
	if (part === null || isSameActivePart(previousSelection, selection)) {
		return viewport;
	}
	const owner = objects[selection.objectIds[0]];
	if (owner === undefined || !isTransformedFrame(owner)) {
		return viewport;
	}
	const region = objectPartKind
		.get(owner.type, part.kind)
		?.region?.(owner, readActivePartFocusId(part));
	if (!region) {
		return viewport;
	}
	const camera = calcCameraToRevealBox(
		viewport,
		calcTransformedRectBounds(region, owner),
		FOCUS_REVEAL_PADDING,
	);
	if (!camera) {
		return viewport;
	}
	return { ...viewport, minX: camera.minX, minY: camera.minY };
};
