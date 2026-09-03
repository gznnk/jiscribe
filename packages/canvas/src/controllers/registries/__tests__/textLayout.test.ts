import type { CanvasDoc } from "@jiscribe/doc/model/canvas/CanvasDoc";
import type { ObjectDoc } from "@jiscribe/doc/model/objects/base/ObjectDoc";
import { roundDocSize } from "@jiscribe/doc/model/objects/utils/roundDocNumbers";
import { describe, expect, it } from "vitest";

import {
	canvasToDoc,
	canvasToState,
} from "../../../states/canvas/CanvasMapper";
import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { CanvasControllerState } from "../../CanvasTypes";
import { ToggleTextLayoutCommand } from "../../commands/shape/ToggleTextLayoutCommand";
import { reconcileObjectContentSizes } from "../../utils/reconcileObjectContentSizes";
import { createCanvasRegistries } from "../createCanvasRegistries";

const registries = createCanvasRegistries();

/** A body long enough that a stored width narrower than it forces line breaks. */
const BODY =
	"This paragraph is authored as one line with no newlines in it at all.";

/** A one-object document holding a single text. */
const textDoc = (
	id: string,
	overrides: Record<string, unknown> = {},
): CanvasDoc => ({
	version: 1,
	root: [
		{
			id,
			type: "text",
			x: 40,
			y: 20,
			text: BODY,
			fontSize: 16,
			...overrides,
		} as unknown as ObjectDoc,
	],
});

const toState = (id: string, doc: CanvasDoc): ObjectState =>
	canvasToState(doc, registries.objectMapper, registries.objectContentResizer)
		.objects[id];

/** The frame fields the tests read off a state without narrowing it. */
const frameOf = (
	state: ObjectState,
): { cx: number; cy: number; width: number; height: number } =>
	state as unknown as {
		cx: number;
		cy: number;
		width: number;
		height: number;
	};

/** The layout field, read off a state without narrowing it. */
const layoutOf = (state: ObjectState): string | undefined =>
	(state as unknown as { textLayout?: string }).textLayout;

/** A controller state holding the given objects, all of them selected. */
const controllerStateOf = (...objects: ObjectState[]): CanvasControllerState =>
	({
		objects: Object.fromEntries(objects.map((object) => [object.id, object])),
		rootIds: objects.map((object) => object.id),
		selectedIds: objects.map((object) => object.id),
		selectedConnectorId: null,
		multiSelectGroup: null,
		commitVersion: 0,
	}) as unknown as CanvasControllerState;

/** Runs the switch and the content-size pass the reducer runs right after it. */
const toggleAndReconcile = (
	state: CanvasControllerState,
): CanvasControllerState => {
	const switched = ToggleTextLayoutCommand.execute(state, registries);
	return reconcileObjectContentSizes(
		switched,
		state,
		registries.objectContentResizer,
	);
};

describe("toggleTextLayout", () => {
	it("keeps the box exactly as drawn when a measured text starts wrapping", () => {
		const label = toState("t", textDoc("t"));
		const state = controllerStateOf(label);

		const reconciled = toggleAndReconcile(state);
		const blocked = reconciled.objects.t;

		expect(layoutOf(blocked)).toBe("block");
		expect(frameOf(blocked).width).toBe(frameOf(label).width);
		expect(frameOf(blocked).height).toBe(frameOf(label).height);
		expect(frameOf(blocked).cx).toBe(frameOf(label).cx);
		expect(frameOf(blocked).cy).toBe(frameOf(label).cy);
	});

	it("stores the width the box was measured at, so the wrap survives a save", () => {
		const label = toState("t", textDoc("t"));

		const blocked = ToggleTextLayoutCommand.execute(
			controllerStateOf(label),
			registries,
		).objects.t;
		const [object] = canvasToDoc(
			{ objects: { t: blocked }, rootIds: ["t"] },
			registries.objectMapper,
		).root as unknown as Record<string, unknown>[];

		expect(object.textLayout).toBe("block");
		expect(object.width).toBe(roundDocSize(frameOf(label).width));
	});

	it("shrinks back to the longest line when a wrapping text goes back to measured", () => {
		// Twice the width the text needs, so the box can only be the stored one.
		const label = toState("t", textDoc("t"));
		const wide = frameOf(label).width * 2;
		const block = toState(
			"t",
			textDoc("t", { textLayout: "block", width: wide }),
		);
		expect(frameOf(block).width).toBe(wide);

		const reconciled = toggleAndReconcile(controllerStateOf(block));
		const measured = reconciled.objects.t;

		expect(layoutOf(measured)).toBeUndefined();
		expect(frameOf(measured).width).toBe(frameOf(label).width);
	});

	it("puts the drawn top-left corner back where it was after either switch", () => {
		const block = toState(
			"t",
			textDoc("t", { textLayout: "block", width: 400 }),
		);

		const measured = toggleAndReconcile(controllerStateOf(block)).objects.t;
		const [object] = canvasToDoc(
			{ objects: { t: measured }, rootIds: ["t"] },
			registries.objectMapper,
		).root as unknown as Record<string, unknown>[];

		expect(object).toMatchObject({ x: 40, y: 20 });
	});

	it("takes a selection holding one measured text to all wrapping in one press", () => {
		const label = toState("a", textDoc("a"));
		const block = toState(
			"b",
			textDoc("b", { textLayout: "block", width: 400 }),
		);
		const state = controllerStateOf(label, block);

		const switched = ToggleTextLayoutCommand.execute(state, registries);

		expect(layoutOf(switched.objects.a)).toBe("block");
		expect(layoutOf(switched.objects.b)).toBe("block");
		// Each keeps its own box: the width written is the one that text is drawn at.
		expect(frameOf(switched.objects.a).width).toBe(frameOf(label).width);
		expect(frameOf(switched.objects.b).width).toBe(400);
	});

	it("takes a selection that is all wrapping back to measured", () => {
		const first = toState(
			"a",
			textDoc("a", { textLayout: "block", width: 400 }),
		);
		const second = toState(
			"b",
			textDoc("b", { textLayout: "block", width: 300 }),
		);

		const switched = ToggleTextLayoutCommand.execute(
			controllerStateOf(first, second),
			registries,
		);

		expect(layoutOf(switched.objects.a)).toBeUndefined();
		expect(layoutOf(switched.objects.b)).toBeUndefined();
	});

	it("leaves the shapes that carry no layout alone", () => {
		const rect = {
			id: "r",
			type: "rect",
			cx: 0,
			cy: 0,
			width: 10,
			height: 10,
		} as unknown as ObjectState;
		const label = toState("t", textDoc("t"));

		const state = controllerStateOf(rect, label);
		const switched = ToggleTextLayoutCommand.execute(state, registries);

		expect(switched.objects.r).toBe(rect);
		expect(layoutOf(switched.objects.t)).toBe("block");
	});

	it("cannot run on a selection holding no text", () => {
		const rect = {
			id: "r",
			type: "rect",
			cx: 0,
			cy: 0,
			width: 10,
			height: 10,
		} as unknown as ObjectState;

		expect(
			ToggleTextLayoutCommand.canExecute(controllerStateOf(rect), registries),
		).toBe(false);
	});
});

describe("the height of a wrapping text as its width changes", () => {
	it("grows when the stored width is dragged narrower", () => {
		const block = toState(
			"t",
			textDoc("t", { textLayout: "block", width: 400 }),
		);
		const narrowed = { ...block, width: 160 } as ObjectState;

		const reconciled = reconcileObjectContentSizes(
			controllerStateOf(narrowed),
			controllerStateOf(block),
			registries.objectContentResizer,
		);

		expect(frameOf(reconciled.objects.t).width).toBe(160);
		expect(frameOf(reconciled.objects.t).height).toBeGreaterThan(
			frameOf(block).height,
		);
	});

	it("puts the derived height back when a drag frame restores the one it opened on", () => {
		const block = toState(
			"t",
			textDoc("t", { textLayout: "block", width: 400 }),
		);
		const narrowed = reconcileObjectContentSizes(
			controllerStateOf({ ...block, width: 160 } as ObjectState),
			controllerStateOf(block),
			registries.objectContentResizer,
		).objects.t;
		// The next frame is rebuilt from the gesture's opening snapshot, so it
		// arrives at the same width carrying the height the drag opened on.
		const rebuilt = {
			...narrowed,
			height: frameOf(block).height,
		} as ObjectState;

		const reconciled = reconcileObjectContentSizes(
			controllerStateOf(rebuilt),
			controllerStateOf(narrowed),
			registries.objectContentResizer,
		);

		expect(frameOf(reconciled.objects.t).height).toBe(frameOf(narrowed).height);
	});
});

describe("the handles a text offers", () => {
	it("gives a wrapping text the two that change its stored width", () => {
		const block = toState(
			"t",
			textDoc("t", { textLayout: "block", width: 400 }),
		);

		expect(registries.objectTransformHandles.resolve(block)).toEqual({
			resize: "width",
		});
	});

	it("gives a measured text none, its box being the text's to decide", () => {
		const label = toState("t", textDoc("t"));

		expect(registries.objectTransformHandles.resolve(label)).toEqual({
			resize: false,
		});
	});
});

describe("the menu a text offers", () => {
	it("holds the layout switch", () => {
		const sections = registries.objectMenu.getSections("text");

		expect(
			sections.some((section) =>
				section.items.some((item) => item.type === "textLayout"),
			),
		).toBe(true);
	});

	it("offers it to no other type", () => {
		for (const type of ["rect", "ellipse", "polygon", "connector"]) {
			const sections = registries.objectMenu.getSections(type);
			expect(
				sections.some((section) =>
					section.items.some((item) => item.type === "textLayout"),
				),
				type,
			).toBe(false);
		}
	});
});
