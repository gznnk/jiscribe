import type { CanvasDoc } from "@jiscribe/doc/model/canvas/CanvasDoc";
import type { ObjectDoc } from "@jiscribe/doc/model/objects/base/ObjectDoc";
import { describe, expect, it } from "vitest";

import {
	canvasToDoc,
	canvasToState,
} from "../../../states/canvas/CanvasMapper";
import type { ObjectState } from "../../../states/objects/base/ObjectState";
import { isValidRectState } from "../../../states/objects/primitives/rect/validateRectState";
import type { CanvasControllerState } from "../../CanvasTypes";
import { ToggleAutoHeightCommand } from "../../commands/shape/ToggleAutoHeightCommand";
import { reconcileObjectContentSizes } from "../../utils/reconcileObjectContentSizes";
import { createCanvasRegistries } from "../createCanvasRegistries";

const registries = createCanvasRegistries();

/** A one-object document whose rect states no height. */
const autoHeightDoc = (overrides: Record<string, unknown> = {}): CanvasDoc => ({
	version: 1,
	root: [
		{
			id: "auto",
			type: "rect",
			x: 40,
			y: 20,
			width: 200,
			text: "a label long enough to take several lines at this width",
			fontSize: 16,
			...overrides,
		} as unknown as ObjectDoc,
	],
});

const toState = (doc: CanvasDoc): ObjectState =>
	canvasToState(doc, registries.objectMapper, registries.objectContentResizer)
		.objects.auto;

/** The two frame fields the tests read off a state without narrowing it. */
const frameOf = (state: ObjectState): { cy: number; height: number } =>
	state as unknown as { cy: number; height: number };

/** A controller state holding one object, enough for the command and the reconcile pass. */
const controllerStateOf = (object: ObjectState): CanvasControllerState =>
	({
		objects: { [object.id]: object },
		rootIds: [object.id],
		selectedIds: [object.id],
		selectedConnectorId: null,
		multiSelectGroup: null,
		commitVersion: 0,
	}) as unknown as CanvasControllerState;

describe("a document that states no height, brought into the canvas", () => {
	it("is drawn at the height its text needs instead of being dropped", () => {
		const state = toState(autoHeightDoc());

		expect(state.autoHeight).toBe(true);
		expect(frameOf(state).height).toBeGreaterThan(0);
		expect(isValidRectState(state)).toBe(true);
	});

	it("puts the derived box's top edge where the document's y is", () => {
		const state = toState(autoHeightDoc());

		expect(frameOf(state).cy - frameOf(state).height / 2).toBe(20);
	});

	it("goes back out stating no height, at the y it came in with", () => {
		const state = toState(autoHeightDoc());

		const [object] = canvasToDoc(
			{ objects: { auto: state }, rootIds: ["auto"] },
			registries.objectMapper,
		).root as unknown as Record<string, unknown>[];

		expect(object.height).toBeUndefined();
		expect(object).toMatchObject({ x: 40, y: 20, width: 200 });
	});

	it("keeps a stated height exactly as it is", () => {
		const state = toState(autoHeightDoc({ height: 500 }));

		expect(state.autoHeight).toBeUndefined();
		expect(frameOf(state).height).toBe(500);
	});
});

describe("the height following the text as things change", () => {
	it("re-measures when the box is made wider", () => {
		const state = toState(autoHeightDoc());
		const widened = { ...state, width: 400 } as ObjectState;

		const reconciled = reconcileObjectContentSizes(
			controllerStateOf(widened),
			controllerStateOf(state),
			registries.objectContentResizer,
		);

		expect(frameOf(reconciled.objects.auto).height).toBeLessThan(
			frameOf(state).height,
		);
	});

	it("re-measures when the text grows", () => {
		const state = toState(autoHeightDoc());
		const typed = {
			...state,
			text: { body: { text: `${"x ".repeat(80)}`, fontSize: 16 } },
		} as unknown as ObjectState;

		const reconciled = reconcileObjectContentSizes(
			controllerStateOf(typed),
			controllerStateOf(state),
			registries.objectContentResizer,
		);

		expect(frameOf(reconciled.objects.auto).height).toBeGreaterThan(
			frameOf(state).height,
		);
	});

	it("leaves a moved shape alone, its box deciding nothing new", () => {
		const state = toState(autoHeightDoc());
		const moved = { ...state, cx: 999 } as ObjectState;
		const movedState = controllerStateOf(moved);

		expect(
			reconcileObjectContentSizes(
				movedState,
				controllerStateOf(state),
				registries.objectContentResizer,
			),
		).toBe(movedState);
	});

	it("puts the derived height back when a drag frame restores the one it opened on", () => {
		const state = toState(autoHeightDoc());
		const widened = { ...state, width: 400 } as ObjectState;
		const reWrapped = reconcileObjectContentSizes(
			controllerStateOf(widened),
			controllerStateOf(state),
			registries.objectContentResizer,
		).objects.auto;
		// The next frame is rebuilt from the gesture's opening snapshot, so it
		// arrives at the same width carrying the height the drag opened on.
		const rebuilt = {
			...reWrapped,
			height: frameOf(state).height,
		} as ObjectState;

		const reconciled = reconcileObjectContentSizes(
			controllerStateOf(rebuilt),
			controllerStateOf(reWrapped),
			registries.objectContentResizer,
		);

		expect(frameOf(reconciled.objects.auto).height).toBe(
			frameOf(reWrapped).height,
		);
	});
});

describe("toggleAutoHeight", () => {
	it("keeps the height the shape is drawn at when switching to a stated one", () => {
		const state = controllerStateOf(toState(autoHeightDoc()));

		const switched = ToggleAutoHeightCommand.execute(state, registries);

		expect(switched.objects.auto.autoHeight).toBeUndefined();
		expect(frameOf(switched.objects.auto).height).toBe(
			frameOf(state.objects.auto).height,
		);
	});

	it("switches back, the derived height arriving with the next content pass", () => {
		const state = controllerStateOf(toState(autoHeightDoc()));
		const fixed = ToggleAutoHeightCommand.execute(state, registries);
		const tall = {
			...fixed,
			objects: {
				auto: { ...fixed.objects.auto, height: 900 } as ObjectState,
			},
		};

		const auto = ToggleAutoHeightCommand.execute(tall, registries);
		const reconciled = reconcileObjectContentSizes(
			auto,
			tall,
			registries.objectContentResizer,
		);

		expect(auto.objects.auto.autoHeight).toBe(true);
		expect(frameOf(reconciled.objects.auto).height).toBe(
			frameOf(state.objects.auto).height,
		);
	});

	it("is offered for the shapes whose document may leave the height out", () => {
		expect(registries.objectAutoHeight.supports("rect")).toBe(true);
		for (const type of ["ellipse", "text", "polygon", "connector", "group"]) {
			expect(registries.objectAutoHeight.supports(type), type).toBe(false);
		}
	});

	it("cannot run on a selection holding nothing switchable", () => {
		const ellipse = {
			id: "e1",
			type: "ellipse",
			cx: 0,
			cy: 0,
			width: 10,
			height: 10,
		} as unknown as ObjectState;

		expect(
			ToggleAutoHeightCommand.canExecute(
				controllerStateOf(ellipse),
				registries,
			),
		).toBe(false);
	});
});
