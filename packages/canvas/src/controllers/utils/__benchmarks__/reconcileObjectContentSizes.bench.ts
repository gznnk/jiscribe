import { bench, describe } from "vitest";

import type { ObjectState } from "../../../states/objects/base/ObjectState";
import { createObjectContentResizerRegistry } from "../../../states/registry/ObjectContentResizerRegistry";
import type { CanvasControllerState } from "../../CanvasTypes";
import { createCowObjects } from "../cowObjects";
import { reconcileObjectContentSizes } from "../reconcileObjectContentSizes";

const OBJECT_COUNT = 2000;

const buildObjects = (): Record<string, ObjectState> => {
	const objects: Record<string, ObjectState> = {};
	for (let index = 0; index < OBJECT_COUNT; index++) {
		const id = `obj-${index}`;
		objects[id] = {
			id,
			type: "rect",
			cx: index,
			cy: index,
			width: 100,
			height: 60,
			rotation: 0,
			scaleX: 1,
			scaleY: 1,
		} as unknown as ObjectState;
	}
	return objects;
};

const baseObjects = buildObjects();
const contentResizer = createObjectContentResizerRegistry();

const stateOf = (objects: Record<string, ObjectState>): CanvasControllerState =>
	({ objects }) as unknown as CanvasControllerState;

const previousState = stateOf(baseObjects);

// One drag frame: the moved object sits in the view's overlay, every other
// object is still the reference the previous frame held.
const cowView = createCowObjects(baseObjects);
cowView["obj-0"] = { ...baseObjects["obj-0"], cx: 999 } as ObjectState;
const cowState = stateOf(cowView);

// The same frame's objects as a plain record: what the pass sees on any path
// that does not hold the map as a copy-on-write view.
const plainState = stateOf({ ...baseObjects, "obj-0": cowView["obj-0"] });

// The pass runs on every frame of every gesture, so what matters is the cost of
// a frame that needs no re-measuring at all — the overwhelmingly common case.
describe(`reconcileObjectContentSizes per frame (${OBJECT_COUNT} objects)`, () => {
	bench("COW view — narrowed to the ids the frame wrote", () => {
		reconcileObjectContentSizes(cowState, previousState, contentResizer);
	});

	bench("plain record — full scan", () => {
		reconcileObjectContentSizes(plainState, previousState, contentResizer);
	});

	bench("COW view, forced — full scan", () => {
		// A web font landing invalidates every measurement at once, so this frame
		// cannot take the narrowed pass however little it wrote.
		reconcileObjectContentSizes(cowState, previousState, contentResizer, true);
	});
});
