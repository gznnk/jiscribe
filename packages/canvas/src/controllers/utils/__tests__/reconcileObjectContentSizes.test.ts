import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../states/objects/base/ObjectState";
import { calcTextObjectFrameSize } from "../../../states/objects/primitives/text/calcTextObjectFrameSize";
import { createObjectContentResizerRegistry } from "../../../states/registry/ObjectContentResizerRegistry";
import type { CanvasControllerState } from "../../CanvasTypes";
import { createTestRegistries } from "../../registries/createCanvasRegistries";
import { createCowObjects, materializeObjects } from "../cowObjects";
import { reconcileObjectContentSizes } from "../reconcileObjectContentSizes";

/** The real per-type wiring, so only `text` is re-measured here. */
const contentResizer = createTestRegistries().objectContentResizer;

const textObject = (id: string, text: string): ObjectState => {
	const { width, height } = calcTextObjectFrameSize(text, { fontSize: 16 });
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
		...overrides,
	}) as unknown as CanvasControllerState;

describe("reconcileObjectContentSizes", () => {
	it("returns the same reference when every box already matches", () => {
		const state = stateOf([textObject("t1", "hello"), rectObject("r1")]);

		expect(reconcileObjectContentSizes(state, state, contentResizer)).toBe(
			state,
		);
	});

	it("leaves a stale box alone while the slots say nothing moved", () => {
		const state = stateOf([withStaleBox(textObject("t1", "hello"))]);

		expect(reconcileObjectContentSizes(state, state, contentResizer)).toBe(
			state,
		);
	});

	it("re-measures that same box when forced", () => {
		// The case the slots cannot express: a web font arriving after the first
		// paint, so the same family measures differently than it did.
		const state = stateOf([withStaleBox(textObject("t1", "hello"))]);

		const next = reconcileObjectContentSizes(
			state,
			state,
			contentResizer,
			true,
		);

		expect(next.objects.t1).toEqual(textObject("t1", "hello"));
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
		// A move writes cx/cy alone, which the comparison leaves out (a region is
		// declared before the position applies), so a per-frame drag re-measures
		// nothing.
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

	it("re-measures a shape whose body moved to the other vertical basis", () => {
		// The basis is the whole of what the toggle writes, so a pass reading only
		// the text and the width would leave the shape at the height the other
		// basis derived (`ToggleTextVerticalBasisCommand`).
		const registry = createObjectContentResizerRegistry();
		registry.register("rect", (state) => ({
			...state,
			height:
				(state as { textVerticalBasis?: string }).textVerticalBasis === "frame"
					? 200
					: 100,
		}));
		const onRegion = { ...rectObject("r1"), height: 100 } as ObjectState;
		const onFrame = {
			...onRegion,
			textVerticalBasis: "frame",
		} as unknown as ObjectState;

		const reconciled = reconcileObjectContentSizes(
			stateOf([onFrame]),
			stateOf([onRegion]),
			registry,
		);

		expect(
			(reconciled.objects.r1 as unknown as { height: number }).height,
		).toBe(200);
	});

	it("re-measures a shape whose region reads a field of the type's own", () => {
		// A text region may read any field its type declares — the callout's tail
		// takes a quarter of the box off one side — so the comparison is on the
		// whole object, not on a list of the fields the shipped types happen to
		// read. Dragging the tail must re-derive the height it changed the room for.
		const registry = createObjectContentResizerRegistry();
		registry.register(
			"rect",
			(state) =>
				({
					...state,
					height:
						(state as unknown as { tail: { side: string } }).tail.side ===
						"right"
							? 80
							: 40,
				}) as ObjectState,
		);
		const tailBelow = {
			...rectObject("r1"),
			autoHeight: true,
			height: 40,
			tail: { side: "bottom", position: 0.5 },
		} as unknown as ObjectState;
		const tailRight = {
			...tailBelow,
			tail: { side: "right", position: 0.5 },
		} as unknown as ObjectState;

		const reconciled = reconcileObjectContentSizes(
			stateOf([tailRight]),
			stateOf([tailBelow]),
			registry,
		);

		expect(
			(reconciled.objects.r1 as unknown as { height: number }).height,
		).toBe(80);
	});

	it("skips an object that was only rotated or flipped", () => {
		// The transform is applied after the local box a region is declared in, so
		// it cannot move a derived height — and a rotate drag must not re-measure
		// on every frame.
		const stale = withStaleBox(textObject("t1", "hello"));
		const previous = stateOf([stale]);
		const rotated = { ...stale, rotation: 45, scaleX: -1 } as ObjectState;
		const state = stateOf([rotated]);

		expect(reconcileObjectContentSizes(state, previous, contentResizer)).toBe(
			state,
		);
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

	it("keeps the untouched objects' identity in the rewritten map", () => {
		const previous = stateOf([]);
		const untouched = rectObject("r1");
		const state = stateOf([withStaleBox(textObject("t1", "hello")), untouched]);

		const next = reconcileObjectContentSizes(state, previous, contentResizer);

		expect(next).not.toBe(state);
		expect(next.objects.r1).toBe(untouched);
	});

	it("grows the frame of the group holding a re-measured text", () => {
		const measured = calcTextObjectFrameSize("hello", { fontSize: 16 });
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

	describe("over a copy-on-write view", () => {
		it("re-measures the object the frame wrote", () => {
			// The narrowed pass must reach a write that changed the text, which is
			// what a font-size drag's uncommitted frames look like.
			const previous = stateOf([textObject("t1", "hello"), rectObject("r1")]);
			const objects = createCowObjects(previous.objects);
			objects.t1 = withStaleBox(textObject("t1", "hello world"));
			const state = { ...previous, objects };

			const next = reconcileObjectContentSizes(state, previous, contentResizer);

			expect(next.objects.t1).toEqual(textObject("t1", "hello world"));
		});

		it("touches no resizer for a frame that only moved objects", () => {
			// The drag hot path: the overlay holds the moved object, whose slots are
			// untouched, so not a single measurement runs.
			const registry = createObjectContentResizerRegistry();
			const seenTypes: string[] = [];
			registry.register("text", (object) => {
				seenTypes.push(object.type);
				return object;
			});
			const previous = stateOf([textObject("t1", "hello"), rectObject("r1")]);
			const objects = createCowObjects(previous.objects);
			objects.r1 = { ...rectObject("r1"), cx: 50 } as ObjectState;
			const state = { ...previous, objects };

			expect(reconcileObjectContentSizes(state, previous, registry)).toBe(
				state,
			);
			expect(seenTypes).toEqual([]);
		});

		it("still re-measures everything when forced", () => {
			// The narrowing itself is bypassed here, not just the slot skip: the
			// objects the frame never wrote are stale too, so reading only the
			// written ids would leave them behind.
			const stale = withStaleBox(textObject("t1", "hello"));
			const previous = stateOf([stale]);
			const state = {
				...previous,
				objects: createCowObjects(previous.objects),
			};

			const next = reconcileObjectContentSizes(
				state,
				previous,
				contentResizer,
				true,
			);

			expect(next.objects.t1).toEqual(textObject("t1", "hello"));
		});

		it("hands back a plain record, so nothing downstream reads through the view", () => {
			const previous = stateOf([textObject("t1", "hello")]);
			const objects = createCowObjects(previous.objects);
			objects.t1 = withStaleBox(textObject("t1", "hello world"));
			const state = { ...previous, objects };

			const next = reconcileObjectContentSizes(state, previous, contentResizer);

			// materializeObjects passes a plain record through by reference, so this
			// is the test for "the view did not survive the pass".
			expect(materializeObjects(next.objects)).toBe(next.objects);
		});
	});
});
