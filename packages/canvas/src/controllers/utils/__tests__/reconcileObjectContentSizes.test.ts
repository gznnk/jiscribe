import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../states/objects/base/ObjectState";
import { calcTextObjectFrameSize } from "../../../states/objects/primitives/text/calcTextObjectFrameSize";
import { createObjectContentResizerRegistry } from "../../../states/registry/ObjectContentResizerRegistry";
import type { CanvasControllerState } from "../../CanvasTypes";
import { createTestRegistries } from "../../registries/createCanvasRegistries";
import { reconcileObjectContentSizes } from "../reconcileObjectContentSizes";

const FONT_FAMILY = "Noto Sans JP";

/** The real per-type wiring, so only `text` is re-measured here. */
const contentResizer = createTestRegistries().objectContentResizer;

const textObject = (id: string, text: string): ObjectState => {
	const { width, height } = calcTextObjectFrameSize(
		text,
		{ fontSize: 16 },
		FONT_FAMILY,
	);
	return {
		id,
		type: "text",
		cx: 100 + width / 2,
		cy: 60 + height / 2,
		width,
		height,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
		text: { body: { text, fontSize: 16 } },
	} as unknown as ObjectState;
};

/** A text object whose box has been shrunk to 1x1 around the same top-left corner. */
const withStaleBox = (object: ObjectState): ObjectState => {
	const frame = object as unknown as {
		cx: number;
		cy: number;
		width: number;
		height: number;
	};
	return {
		...object,
		cx: frame.cx - frame.width / 2 + 0.5,
		cy: frame.cy - frame.height / 2 + 0.5,
		width: 1,
		height: 1,
	} as ObjectState;
};

const rectObject = (id: string): ObjectState =>
	({
		id,
		type: "rect",
		cx: 0,
		cy: 0,
		width: 1,
		height: 1,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
		text: { body: { text: "a long label", fontSize: 16 } },
	}) as unknown as ObjectState;

const stateOf = (
	objects: ObjectState[],
	overrides: Partial<CanvasControllerState> = {},
): CanvasControllerState =>
	({
		objects: Object.fromEntries(objects.map((object) => [object.id, object])),
		docDefaults: { fontFamily: FONT_FAMILY },
		...overrides,
	}) as unknown as CanvasControllerState;

describe("reconcileObjectContentSizes", () => {
	it("returns the same reference when every box already matches", () => {
		const state = stateOf([textObject("t1", "hello"), rectObject("r1")]);

		expect(reconcileObjectContentSizes(state, state, contentResizer)).toBe(
			state,
		);
	});

	it("re-measures a text object whose text changed", () => {
		const previous = stateOf([textObject("t1", "hello")]);
		const state = stateOf([withStaleBox(textObject("t1", "hello world"))]);

		const next = reconcileObjectContentSizes(state, previous, contentResizer);

		expect(next.objects.t1).toEqual(textObject("t1", "hello world"));
	});

	it("re-measures a text object the previous state did not hold", () => {
		// A newly placed or pasted object has nothing to compare against.
		const previous = stateOf([]);
		const state = stateOf([withStaleBox(textObject("t1", "hello"))]);

		const next = reconcileObjectContentSizes(state, previous, contentResizer);

		expect(next.objects.t1).toEqual(textObject("t1", "hello"));
	});

	it("skips an object that kept its slots, however else it was rewritten", () => {
		// A move writes cx/cy and passes the slots through, so it cannot have
		// changed what the box measures to — the comparison is on the slots, not on
		// the object, so a per-frame drag re-measures nothing.
		const stale = withStaleBox(textObject("t1", "hello"));
		const previous = stateOf([stale]);
		const moved = {
			...stale,
			cx: (stale as unknown as { cx: number }).cx + 50,
		};
		const state = stateOf([moved as ObjectState]);

		expect(reconcileObjectContentSizes(state, previous, contentResizer)).toBe(
			state,
		);
	});

	it("leaves every non-text object alone, however wrong its box looks", () => {
		const previous = stateOf([]);
		const state = stateOf([rectObject("r1")]);

		expect(reconcileObjectContentSizes(state, previous, contentResizer)).toBe(
			state,
		);
	});

	it("never calls a resizer for a type that has none registered", () => {
		// The skip is decided by the registry lookup alone: a type absent from it is
		// not merely left unchanged, it is never handed to a resizer at all.
		const registry = createObjectContentResizerRegistry();
		const seenTypes: string[] = [];
		registry.register("text", (state) => {
			seenTypes.push(state.type);
			return state;
		});
		const previous = stateOf([]);
		const state = stateOf([
			rectObject("r1"),
			withStaleBox(textObject("t1", "hello")),
		]);

		reconcileObjectContentSizes(state, previous, registry);

		expect(seenTypes).toEqual(["text"]);
	});

	it("re-measures nothing at all when the registry holds no resizer", () => {
		// The state of a canvas configured without a single derived-box type: the
		// pass must be a no-op even for the objects that would otherwise qualify.
		const previous = stateOf([]);
		const state = stateOf([withStaleBox(textObject("t1", "hello"))]);

		expect(
			reconcileObjectContentSizes(
				state,
				previous,
				createObjectContentResizerRegistry(),
			),
		).toBe(state);
	});

	it("costs nothing on a document holding no text object", () => {
		// The pass now runs on every frame of every gesture, so a document without
		// a single text object must come back untouched no matter what changed.
		const previous = stateOf([rectObject("r1")]);
		const state = stateOf([rectObject("r1"), rectObject("r2")]);

		expect(reconcileObjectContentSizes(state, previous, contentResizer)).toBe(
			state,
		);
	});

	it("re-measures every text object when the theme's family changed", () => {
		// The slot comparison is bypassed here: no edit touched the objects, but the
		// family they are drawn in did.
		const stale = withStaleBox(textObject("t1", "hello"));
		const previous = stateOf([stale], {
			docDefaults: { fontFamily: "Some Other Family" },
		});
		const state = stateOf([stale]);

		const next = reconcileObjectContentSizes(state, previous, contentResizer);

		expect(next.objects.t1).not.toBe(stale);
		expect(next.objects.t1).toEqual(textObject("t1", "hello"));
	});

	it("keeps the untouched objects' identity in the rewritten map", () => {
		const previous = stateOf([]);
		const untouched = rectObject("r1");
		const state = stateOf([withStaleBox(textObject("t1", "hello")), untouched]);

		const next = reconcileObjectContentSizes(state, previous, contentResizer);

		expect(next).not.toBe(state);
		expect(next.objects.r1).toBe(untouched);
	});

	it("grows the frame of the group holding a re-measured text", () => {
		const measured = calcTextObjectFrameSize(
			"hello",
			{ fontSize: 16 },
			FONT_FAMILY,
		);
		const previous = stateOf([]);
		const state = stateOf([
			{
				...withStaleBox(textObject("t1", "hello")),
				parentId: "g1",
			} as ObjectState,
			{
				id: "g1",
				type: "group",
				childIds: ["t1"],
				cx: 0,
				cy: 0,
				width: 1,
				height: 1,
				rotation: 0,
				scaleX: 1,
				scaleY: 1,
			} as unknown as ObjectState,
		]);

		const next = reconcileObjectContentSizes(state, previous, contentResizer);

		const group = next.objects.g1 as unknown as {
			width: number;
			height: number;
		};
		const text = next.objects.t1 as unknown as {
			width: number;
			height: number;
		};
		expect(text.width).toBeCloseTo(measured.width);
		expect(group.width).toBeCloseTo(measured.width);
		expect(group.height).toBeCloseTo(measured.height);
	});
});
