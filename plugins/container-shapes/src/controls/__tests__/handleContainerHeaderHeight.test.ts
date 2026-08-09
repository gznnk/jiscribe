import type {
	SelectionControlContext,
	SelectionControlEvent,
} from "@jiscribe/canvas";
import type { Point } from "@jiscribe/geometry";
import { describe, expect, it } from "vitest";

import type { ContainerState } from "../../state/ContainerState";
import { handleContainerHeaderHeight } from "../handleContainerHeaderHeight";

/** Container of 200x160 centered at (100, 100): top edge y=20, bottom edge y=180. */
const makeContainer = (
	overrides: Partial<ContainerState> = {},
): ContainerState =>
	({
		id: "container-1",
		type: "container",
		cx: 100,
		cy: 100,
		width: 200,
		height: 160,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
		...overrides,
	}) as unknown as ContainerState;

const makeContext = (
	container: ContainerState,
): SelectionControlContext<ContainerState> => ({
	object: container,
	startObject: container,
});

const makeEvent = (
	last: Point,
	type: "drag" | "dragEnd" = "drag",
): SelectionControlEvent => ({
	type,
	start: { x: 0, y: 0 },
	last,
	delta: { x: 0, y: 0 },
	mods: { shift: false, alt: false, ctrl: false, meta: false },
});

describe("handleContainerHeaderHeight", () => {
	it("derives headerHeight from the cursor's distance to the top edge", () => {
		const next = handleContainerHeaderHeight(
			makeContext(makeContainer()),
			makeEvent({ x: 100, y: 60 }),
		);
		expect(next.headerHeight).toBe(40);
	});

	it("clamps to the minimum header height", () => {
		const next = handleContainerHeaderHeight(
			makeContext(makeContainer()),
			makeEvent({ x: 100, y: 22 }),
		);
		expect(next.headerHeight).toBe(16);
	});

	it("clamps to the container height", () => {
		const next = handleContainerHeaderHeight(
			makeContext(makeContainer()),
			makeEvent({ x: 100, y: 500 }),
		);
		expect(next.headerHeight).toBe(160);
	});

	it("never persists below 1 even when the container height is sub-pixel", () => {
		// height 0.5 -> the height-side clamp would give 0.5, which the doc
		// validator (min 1) rejects; the persisted value floors at 1
		const next = handleContainerHeaderHeight(
			makeContext(makeContainer({ height: 0.5 })),
			makeEvent({ x: 100, y: 100 }),
		);
		expect(next.headerHeight).toBe(1);
	});

	it("maps the cursor through the inverse transform for rotated containers", () => {
		// rotation=90: local (0, ly) maps to world (cx - ly, cy);
		// cursor (140, 100) -> ly = -40 -> headerHeight = -40 + 160/2 = 40
		const next = handleContainerHeaderHeight(
			makeContext(makeContainer({ rotation: 90 })),
			makeEvent({ x: 140, y: 100 }),
		);
		expect(next.headerHeight).toBe(40);
	});

	it("returns the updated object without mutating the input", () => {
		const container = makeContainer();
		const next = handleContainerHeaderHeight(
			makeContext(container),
			makeEvent({ x: 100, y: 60 }),
		);
		expect(container.headerHeight).toBeUndefined();
		expect(next).not.toBe(container);
	});
});
