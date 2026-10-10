import type { Rect } from "@jiscribe/geometry";

import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { CanvasSelection } from "../../selection/CanvasSelection";
import type { ObjectPartKindRegistry } from "../../selection/partKinds/ObjectPartKindRegistry";
import { collectObjectPartIds } from "../../selection/readers/collectObjectPartIds";

/** A selected part together with the box drawn around it. */
export type OutlinedPartRegion = {
	/** The part's id within its owner, as the selection's ranges spell it */
	partId: string;
	/** The box its type answers with (ObjectPartKindDefinition.region), in the owner's local coordinates */
	region: Rect;
};

/**
 * The selected parts that are drawn with a box around them, each with its box.
 *
 * The one answer both the selection overlay (which draws the boxes) and the
 * transform handles (hidden while any box is drawn, TransformControlsLayer)
 * read, so the two never disagree about whether a part is outlined. A kind
 * declaring no `region` — a point a shape is dragged by, say — outlines nothing.
 *
 * @param objects - The canvas's objects, for looking the selection's owner up by id
 * @param registry - The part registry the owner's type declared its kinds in
 * @param selection - What the canvas is pointed at (`state.selection`, whose
 *   `part` the reducer keeps valid, reconcileSelection); the part's owner is the
 *   sole selected object
 * @returns The outlined parts in the order collectObjectPartIds expands the
 *   selection into; empty when no part is selected, the owner is gone, its type
 *   has no definition for the kind or one without `region`. A part whose
 *   `region` answers null is left out
 */
export const collectOutlinedPartRegions = (
	objects: Readonly<Record<string, ObjectState>>,
	registry: ObjectPartKindRegistry,
	selection: CanvasSelection,
): readonly OutlinedPartRegion[] => {
	const { objectIds, part } = selection;
	if (part === null) {
		return [];
	}
	const owner = objects[objectIds[0]];
	if (owner === undefined) {
		return [];
	}
	const definition = registry.get(owner.type, part.kind);
	const region = definition?.region;
	if (definition === undefined || region === undefined) {
		return [];
	}
	const outlined: OutlinedPartRegion[] = [];
	for (const partId of collectObjectPartIds(part, definition, owner)) {
		const partRegion = region(owner, partId);
		if (partRegion !== null) {
			outlined.push({ partId, region: partRegion });
		}
	}
	return outlined;
};
