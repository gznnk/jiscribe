import { bench, describe } from "vitest";

import type { ObjectState } from "../../../states/objects/base/ObjectState";
import { createObjectContentResizerRegistry } from "../../../states/registry/ObjectContentResizerRegistry";
import type { CanvasControllerState } from "../../CanvasTypes";
import {
	collectStateImageSources,
	holdsSameImageSources,
} from "../collectStateImageSources";
import { createCowObjects } from "../cowObjects";
import { reconcileObjectContentSizes } from "../reconcileObjectContentSizes";
import { updateAffectedGroupBounds } from "../updateAffectedGroupBounds";

const GROUP_CHILD_COUNT = 5;
const MOVED_ID = "child-0";

const frame = (id: string, type: string, cx: number, parentId?: string) =>
	({
		id,
		type,
		cx,
		cy: cx,
		width: 100,
		height: 60,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
		parentId,
	}) as unknown as ObjectState;

// Half of the objects carry a resizer, as text-bearing shapes do.
const buildObjects = (objectCount: number): Record<string, ObjectState> => {
	const objects: Record<string, ObjectState> = {};
	for (let index = 0; index < objectCount; index++) {
		const id = `obj-${index}`;
		objects[id] = frame(id, index % 2 === 0 ? "text" : "rect", index);
	}
	const childIds: string[] = [];
	for (let index = 0; index < GROUP_CHILD_COUNT; index++) {
		const id = `child-${index}`;
		childIds.push(id);
		objects[id] = frame(id, "rect", index * 120, "g");
	}
	objects.g = { ...frame("g", "group", 0), childIds } as ObjectState;
	return objects;
};

const contentResizer = createObjectContentResizerRegistry();
contentResizer.register("text", (object) => object);

const stateOf = (objects: Record<string, ObjectState>): CanvasControllerState =>
	({ objects }) as unknown as CanvasControllerState;

// One frame of a grouped selection-control drag as the reducer and the canvas
// run it: the control writes through a view rebased on the previous frame
// (RegisteredSelectionControl), the group frame is recomputed, the content pass
// settles boxes, useDocImages checks the image sources, and the renderer reads
// every object once.
const runFrame = (
	previousState: CanvasControllerState,
	allIds: readonly string[],
	step: number,
): CanvasControllerState => {
	const written = createCowObjects(previousState.objects);
	written[MOVED_ID] = { ...written[MOVED_ID], cx: step } as ObjectState;
	const grouped = updateAffectedGroupBounds(
		{ ...previousState, objects: written },
		[MOVED_ID],
	);
	const settled = reconcileObjectContentSizes(
		grouped,
		previousState,
		contentResizer,
	);
	if (!holdsSameImageSources(settled.objects, previousState.objects)) {
		collectStateImageSources(settled.objects);
	}
	let sum = 0;
	for (const id of allIds) {
		sum += (settled.objects[id] as unknown as { cx: number }).cx;
	}
	if (Number.isNaN(sum)) {
		throw new Error("unreachable");
	}
	return settled;
};

describe("updateAffectedGroupBounds: one grouped drag frame, end to end", () => {
	for (const objectCount of [1000, 5000, 20000]) {
		const baseObjects = buildObjects(objectCount);
		const allIds = Object.keys(baseObjects);
		// Each frame runs from the state the previous one left, since the shape
		// of that state (plain or view) is what the next frame inherits.
		let state = stateOf(baseObjects);
		let step = 0;

		bench(`${objectCount} objects`, () => {
			state = runFrame(state, allIds, ++step);
		});
	}
});
