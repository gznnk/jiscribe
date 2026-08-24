import type { CanvasDoc } from "@jiscribe/doc/model/canvas/CanvasDoc";
import type { ObjectDoc } from "@jiscribe/doc/model/objects/base/ObjectDoc";
import { describe, expect, it } from "vitest";

import type { CanvasPlugin } from "../../../plugin/CanvasPlugin";
import { defineObject } from "../../../plugin/ObjectTypeDefinition";
import { createFrameMapper } from "../../../states/objects/base/FrameMapper";
import type { CanvasControllerState } from "../../CanvasTypes";
import { createCanvasRegistries } from "../../registries/createCanvasRegistries";
import { createCanvasReducer } from "../canvasReducer";
import { createInitialControllerState } from "../createInitialControllerState";

/**
 * The chain nothing runs end to end: switching a body onto the shape's whole
 * height re-derives the height of a shape whose document states none.
 *
 * Each link has its own test — the command writes the field
 * (`registries/textVerticalBasis`), the pass re-measures on it
 * (`utils/reconcileObjectContentSizes`), the derivation reads it
 * (`calcAutoShapeHeight`) — and all three would stay green if the reducer
 * stopped running the pass after a command. This is the one that would not.
 *
 * The two switches are declared on disjoint sets of the built-ins (only
 * `ellipse` takes the basis, only `rect` takes the derived height), so the shape
 * that needs both is registered here as a plugin type: a box keeping a band at
 * its foot clear, which is what a `document`'s wavy edge is. The band is at one
 * end rather than at both because a region centred on the box gives the two
 * bases the same room, and therefore the same derived height
 * (`calcAutoShapeHeight`).
 */

/** A box keeping the bottom fifth of its own height clear, as a document's wavy foot does. */
const cappedFeatures = {
	type: "capped",
	geometry: "rect",
	transform: true,
	stroke: true,
	fill: true,
	text: "body",
} as const;

const cappedPlugin: CanvasPlugin = {
	id: "capped-plugin",
	objects: {
		capped: defineObject({
			features: cappedFeatures,
			textRegion: ({ width, height }) => ({
				x: -width / 2,
				y: -height / 2,
				width,
				height: height * 0.8,
			}),
			validateDoc: () => [],
			mapper: createFrameMapper(cappedFeatures),
			stateValidator: () => true,
			component: () => null,
			behavior: {
				moveByDelta: (state) => state,
				transformByGroup: (state) => state,
				rotateByGroup: (state) => state,
			},
		}),
	},
};

const registries = createCanvasRegistries({ plugins: [cappedPlugin] });
const reducer = createCanvasReducer(registries);

/** One capped shape stating no height, so the canvas derives it from the text. */
const cappedDoc: CanvasDoc = {
	version: 1,
	root: [
		{
			id: "capped-1",
			type: "capped",
			x: 40,
			y: 20,
			width: 200,
			text: "a label long enough to take several lines at this width",
			fontSize: 16,
		} as unknown as ObjectDoc,
	],
};

/** The initial state with the shape selected, which is what the command acts on. */
const createSelectedState = (): CanvasControllerState => {
	const state = createInitialControllerState(cappedDoc, registries);
	return { ...state, selectedIds: ["capped-1"] };
};

/** The two fields the chain moves, read off a state without narrowing it. */
const shapeOf = (
	state: CanvasControllerState,
): { height: number; textVerticalBasis?: string } =>
	state.objects["capped-1"] as unknown as {
		height: number;
		textVerticalBasis?: string;
	};

const runCommand = (
	state: CanvasControllerState,
	commandId: string,
): CanvasControllerState => reducer(state, { type: "COMMAND", commandId });

describe("switching the vertical basis of a shape whose document states no height", () => {
	it("offers both switches on the one type that takes them", () => {
		expect(registries.objectAutoHeight.supports("capped")).toBe(true);
		expect(registries.objectTextVerticalBasis.supports("capped")).toBe(true);
	});

	it("re-derives the height on the basis the switch just wrote", () => {
		const state = createSelectedState();
		const onRegion = shapeOf(state);
		expect(onRegion.textVerticalBasis).toBeUndefined();
		expect(onRegion.height).toBeGreaterThan(0);

		const switched = runCommand(state, "toggleTextVerticalBasis");

		const onFrame = shapeOf(switched);
		expect(onFrame.textVerticalBasis).toBe("frame");
		// A block centred on the whole height still has to stay inside a region
		// that sits off centre, so the nearer edge sets the room and the shape has
		// to be drawn taller to leave the same text the same space.
		expect(onFrame.height).toBeGreaterThan(onRegion.height);
	});

	it("puts the height back when the switch is undone", () => {
		const state = createSelectedState();
		const switched = runCommand(state, "toggleTextVerticalBasis");
		expect(shapeOf(switched).height).not.toBe(shapeOf(state).height);

		const undone = runCommand(switched, "undo");

		expect(shapeOf(undone).textVerticalBasis).toBeUndefined();
		expect(shapeOf(undone).height).toBe(shapeOf(state).height);
	});
});
