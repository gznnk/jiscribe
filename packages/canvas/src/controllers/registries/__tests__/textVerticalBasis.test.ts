import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { CanvasControllerState } from "../../CanvasTypes";
import { ToggleTextVerticalBasisCommand } from "../../commands/shape/ToggleTextVerticalBasisCommand";
import { selectionOf } from "../../selection/__tests__/support/selectionOf";
import { applyStyleIntent } from "../../style/applyStyleIntent";
import { readSelectionStyle } from "../../style/readSelectionStyle";
import { styleIntentOf } from "../../style/styleIntentOf";
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
		selection: selectionOf(objects.map((object) => object.id)),
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
		expect(
			ToggleTextVerticalBasisCommand.canExecute(
				controllerStateOf(shapeOf("e1", "ellipse")),
				registries,
			),
		).toBe(true);
		for (const type of ["rect", "text", "polygon", "connector", "group"]) {
			expect(
				ToggleTextVerticalBasisCommand.canExecute(
					controllerStateOf(shapeOf("o1", type)),
					registries,
				),
				type,
			).toBe(false);
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

		expect(readSelectionStyle(state, "textVerticalBasis", registries)).toEqual({
			kind: "mixed",
			values: ["frame", "region"],
		});

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

	describe("as the sidebar's segmented control reads it", () => {
		const readBasis = (state: CanvasControllerState) =>
			readSelectionStyle(state, "textVerticalBasis", registries);

		it("nothing switchable in the selection → none", () => {
			expect(readBasis(controllerStateOf(shapeOf("r1", "rect")))).toEqual({
				kind: "none",
			});
		});

		it("an absent field reads as the region basis", () => {
			expect(readBasis(controllerStateOf(shapeOf("e1", "ellipse")))).toEqual({
				kind: "single",
				value: "region",
			});
		});

		it("a switched ellipse reads as the frame basis", () => {
			expect(
				readBasis(controllerStateOf(shapeOf("e1", "ellipse", "frame"))),
			).toEqual({ kind: "single", value: "frame" });
		});

		it("a rect mixed into the selection has no say", () => {
			expect(
				readBasis(
					controllerStateOf(shapeOf("e1", "ellipse"), shapeOf("r1", "rect")),
				),
			).toEqual({ kind: "single", value: "region" });
		});
	});

	describe("stated outright through the style property", () => {
		const applyBasis = (state: CanvasControllerState, value: string) => {
			const intent = styleIntentOf("textVerticalBasis", value);
			return intent === undefined
				? state
				: applyStyleIntent(state, intent, registries);
		};

		it("places every switchable body on the box named, and leaves the rest alone", () => {
			const state = controllerStateOf(
				shapeOf("e1", "ellipse"),
				shapeOf("e2", "ellipse", "frame"),
				shapeOf("r1", "rect"),
			);

			const onFrame = applyBasis(state, "frame");
			expect(basisOf(onFrame, "e1")).toBe("frame");
			expect(basisOf(onFrame, "e2")).toBe("frame");
			expect(basisOf(onFrame, "r1")).toBeUndefined();

			// Back on the region the field is removed, that being how the region is read
			const onRegion = applyBasis(onFrame, "region");
			expect(basisOf(onRegion, "e1")).toBeUndefined();
			expect(basisOf(onRegion, "e2")).toBeUndefined();
		});

		it("returns the state as-is when nothing in the selection can be switched", () => {
			const state = controllerStateOf(shapeOf("r1", "rect"));
			expect(applyBasis(state, "frame")).toBe(state);
		});

		it("refuses a value that names neither box", () => {
			const state = controllerStateOf(shapeOf("e1", "ellipse"));
			expect(() => applyBasis(state, "middle")).toThrow(/region.*frame/);
		});
	});
});
