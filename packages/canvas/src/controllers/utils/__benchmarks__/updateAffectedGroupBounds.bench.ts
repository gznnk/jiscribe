import { bench, describe } from "vitest";

import type { ObjectState } from "../../../states/objects/base/ObjectState";
import { createObjectContentResizerRegistry } from "../../../states/registry/ObjectContentResizerRegistry";
import type { CanvasControllerState } from "../../CanvasTypes";
import {
	collectStateImageSources,
	holdsSameImageSources,
} from "../collectStateImageSources";
import { copyObjectsRecord, createCowObjects } from "../cowObjects";
import { reconcileObjectContentSizes } from "../reconcileObjectContentSizes";
import { updateAffectedGroupBounds } from "../updateAffectedGroupBounds";
import { updateGroupBounds } from "../updateGroupBounds";

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

// What the pass did before it kept a view a view: copy every object into a
// plain Record, which also leaves the passes after it nothing to narrow to.
const updateAffectedGroupBoundsByCopy = (
	state: CanvasControllerState,
): CanvasControllerState => {
	const updatedObjects = copyObjectsRecord(state.objects);
	const updatedGroup = updateGroupBounds(updatedObjects, "g");
	if (updatedGroup) {
		updatedObjects.g = updatedGroup;
	}
	return { ...state, objects: updatedObjects };
};

type UpdateGroups = (state: CanvasControllerState) => CanvasControllerState;

const keepingTheView: UpdateGroups = (state) =>
	updateAffectedGroupBounds(state, [MOVED_ID]);

// One frame of a grouped selection-control drag as the reducer and the canvas
// run it: the control writes through a view rebased on the previous frame
// (RegisteredSelectionControl), the group frame is recomputed, the content pass
// settles boxes, useDocImages checks the image sources, and the renderer reads
// every object once.
const runFrame = (
	previousState: CanvasControllerState,
	allIds: readonly string[],
	updateGroups: UpdateGroups,
	step: number,
): CanvasControllerState => {
	const written = createCowObjects(previousState.objects);
	written[MOVED_ID] = { ...written[MOVED_ID], cx: step } as ObjectState;
	const grouped = updateGroups({ ...previousState, objects: written });
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

for (const objectCount of [1000, 5000, 20000]) {
	describe(`grouped drag frame (${objectCount} objects)`, () => {
		const baseObjects = buildObjects(objectCount);
		const allIds = Object.keys(baseObjects);

		// Each variant runs from the state its own previous frame left, since the
		// shape of that state (plain or view) is what the next frame inherits.
		let copyingState = stateOf(copyObjectsRecord(baseObjects));
		let viewState = stateOf(baseObjects);
		let step = 0;

		bench("copy to a plain record (before)", () => {
			copyingState = runFrame(
				copyingState,
				allIds,
				updateAffectedGroupBoundsByCopy,
				++step,
			);
		});

		bench("keep the view (after)", () => {
			viewState = runFrame(viewState, allIds, keepingTheView, ++step);
		});
	});
}
