import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { CanvasControllerState } from "../../CanvasTypes";
import {
	isSelectionTextVerticalBasisFrame,
	ToggleTextVerticalBasisCommand,
} from "../../commands/shape/ToggleTextVerticalBasisCommand";
import { createCanvasRegistries } from "../createCanvasRegistries";

const registries = createCanvasRegistries();

/** A drawn shape of `type`, with whatever basis it is meant to start on. */
const shapeOf = (
	id: string,
	type: string,
	textVerticalBasis?: "frame",
): ObjectState =>
	({
		id,
		type,
		cx: 0,
		cy: 0,
		width: 200,
		height: 100,
		text: { body: { text: "a label" } },
		...(textVerticalBasis ? { textVerticalBasis } : {}),
	}) as unknown as ObjectState;

/** A controller state selecting every object handed to it, in that order. */
const controllerStateOf = (...objects: ObjectState[]): CanvasControllerState =>
	({
		objects: Object.fromEntries(objects.map((object) => [object.id, object])),
		rootIds: objects.map((object) => object.id),
		selectedIds: objects.map((object) => object.id),
		selectedConnectorId: null,
		multiSelectGroup: null,
		commitVersion: 0,
	}) as unknown as CanvasControllerState;

/** The basis an object of the switched state carries, `undefined` for the region. */
const basisOf = (
	state: CanvasControllerState,
	id: string,
): string | undefined =>
	(state.objects[id] as ObjectState & { textVerticalBasis?: string })
		.textVerticalBasis;

describe("the vertical basis a body is placed against", () => {
	it("is switchable exactly for the types whose region gives up part of the height", () => {
		expect(registries.objectTextVerticalBasis.supports("ellipse")).toBe(true);
		for (const type of ["rect", "text", "polygon", "connector", "group"]) {
			expect(registries.objectTextVerticalBasis.supports(type), type).toBe(
				false,
			);
		}
	});

	it("puts the text on the whole height and takes it back", () => {
		const state = controllerStateOf(shapeOf("e1", "ellipse"));

		const onFrame = ToggleTextVerticalBasisCommand.execute(state, registries);
		expect(basisOf(onFrame, "e1")).toBe("frame");
		expect(onFrame.commitVersion).toBe(state.commitVersion + 1);

		// Back on the region the field goes away rather than being written as
		// "region", the absence being what a document spells it with.
		const onRegion = ToggleTextVerticalBasisCommand.execute(
			onFrame,
			registries,
		);
		expect(basisOf(onRegion, "e1")).toBeUndefined();
		expect("textVerticalBasis" in onRegion.objects.e1).toBe(false);
	});

	it("leaves the box exactly as it was drawn", () => {
		const state = controllerStateOf(shapeOf("e1", "ellipse"));

		const switched = ToggleTextVerticalBasisCommand.execute(state, registries);

		expect(switched.objects.e1).toMatchObject({
			cx: 0,
			cy: 0,
			width: 200,
			height: 100,
		});
	});

	it("switches only the shapes it moves, leaving the rest of the selection alone", () => {
		const state = controllerStateOf(
			shapeOf("e1", "ellipse"),
			shapeOf("r1", "rect"),
		);

		const switched = ToggleTextVerticalBasisCommand.execute(state, registries);

		expect(basisOf(switched, "e1")).toBe("frame");
		expect(basisOf(switched, "r1")).toBeUndefined();
	});

	it("reads a mixed selection as not yet switched, so one press brings it all over", () => {
		const state = controllerStateOf(
			shapeOf("e1", "ellipse", "frame"),
			shapeOf("e2", "ellipse"),
		);

		expect(
			isSelectionTextVerticalBasisFrame(
				state,
				registries.objectTextVerticalBasis,
			),
		).toBe(false);

		const switched = ToggleTextVerticalBasisCommand.execute(state, registries);
		expect(basisOf(switched, "e1")).toBe("frame");
		expect(basisOf(switched, "e2")).toBe("frame");
	});

	it("cannot run on a selection holding nothing switchable", () => {
		expect(
			ToggleTextVerticalBasisCommand.canExecute(
				controllerStateOf(shapeOf("r1", "rect")),
				registries,
			),
		).toBe(false);
	});
});
