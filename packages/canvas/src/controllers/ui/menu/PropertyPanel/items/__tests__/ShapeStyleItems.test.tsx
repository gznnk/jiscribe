// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ObjectState } from "../../../../../../states/objects/base/ObjectState";
import type { CanvasControllerState } from "../../../../../CanvasTypes";
import { StrokeWidthItem } from "../ShapeStyleItems";

// Without this React treats every `act` below as unsupported and warns, the
// flushes being correct all the same.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

/** A shape declaring both style groups, the way a rect's features do. */
const rect = (id: string, strokeWidth: number): ObjectState =>
	({
		id,
		type: "rect",
		features: { type: "rect", geometry: "rect", stroke: true, fill: true },
		strokeWidth,
	}) as unknown as ObjectState;

const stateOf = (...shapes: ObjectState[]): CanvasControllerState =>
	({
		selectedIds: shapes.map((shape) => shape.id),
		selectedConnectorId: null,
		objects: Object.fromEntries(shapes.map((shape) => [shape.id, shape])),
	}) as unknown as CanvasControllerState;

let container: HTMLDivElement | null = null;
let root: ReturnType<typeof createRoot> | null = null;

const render = (element: React.ReactElement): HTMLDivElement => {
	if (!container) {
		container = document.createElement("div");
		document.body.appendChild(container);
		root = createRoot(container);
	}
	const mounted = root;
	act(() => {
		mounted?.render(element);
	});
	return container;
};

/** jsdom has no PointerEvent, and a MouseEvent carries the `button` the spin buttons read. */
const pressOn = (target: EventTarget): void => {
	act(() => {
		target.dispatchEvent(
			new MouseEvent("pointerdown", { bubbles: true, button: 0 }),
		);
	});
};

const stepUp = (): void => {
	const button = container?.querySelectorAll("button")[0];
	if (!(button instanceof HTMLButtonElement)) {
		throw new Error("the row did not render its spin buttons");
	}
	pressOn(button);
};

afterEach(() => {
	act(() => {
		root?.unmount();
	});
	container?.remove();
	container = null;
	root = null;
});

describe("StrokeWidthItem", () => {
	it("steps from the agreed width", () => {
		const onPropertyUpdate = vi.fn();
		render(
			<StrokeWidthItem
				canvasState={stateOf(rect("a", 4), rect("b", 4))}
				onPropertyUpdate={onPropertyUpdate}
				onTransformUpdate={vi.fn()}
			/>,
		);

		stepUp();

		expect(onPropertyUpdate).toHaveBeenCalledWith(
			"strokeWidth",
			"5",
			true,
			true,
		);
	});

	it("steps from a width of the selection, not from the row's own default, while the two disagree", () => {
		const onPropertyUpdate = vi.fn();
		render(
			<StrokeWidthItem
				canvasState={stateOf(rect("a", 4), rect("b", 8))}
				onPropertyUpdate={onPropertyUpdate}
				onTransformUpdate={vi.fn()}
			/>,
		);
		const input = container?.querySelector("input");
		// Drawn empty, since neither width is the selection's.
		expect(input?.value).toBe("");

		stepUp();

		expect(onPropertyUpdate).toHaveBeenCalledWith(
			"strokeWidth",
			"5",
			true,
			true,
		);
	});
});
