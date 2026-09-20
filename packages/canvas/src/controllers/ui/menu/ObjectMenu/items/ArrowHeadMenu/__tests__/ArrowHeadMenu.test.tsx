// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import type { ObjectState } from "../../../../../../../states/objects/base/ObjectState";
import type { CanvasControllerState } from "../../../../../../CanvasTypes";
import { ArrowHeadMenu } from "../ArrowHeadMenu";

// Without this React treats every `act` below as unsupported and warns, the
// flushes being correct all the same.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

/** A line declaring the arrow group, with the marks its two ends carry. */
const line = (id: string, startArrow: string, endArrow: string): ObjectState =>
	({
		id,
		type: "polyline",
		features: { type: "polyline", geometry: "poly", arrow: true },
		startArrow,
		endArrow,
	}) as unknown as ObjectState;

const stateOf = (...shapes: ObjectState[]): CanvasControllerState =>
	({
		selectedIds: shapes.map((shape) => shape.id),
		selectedConnectorId: null,
		objectMenuOpenId: null,
		objects: Object.fromEntries(shapes.map((shape) => [shape.id, shape])),
	}) as unknown as CanvasControllerState;

let container: HTMLDivElement | null = null;
let root: ReturnType<typeof createRoot> | null = null;

const render = (element: React.ReactElement): void => {
	if (!container) {
		container = document.createElement("div");
		document.body.appendChild(container);
		root = createRoot(container);
	}
	const mounted = root;
	act(() => {
		mounted?.render(element);
	});
};

/** The two end triggers, in the order they are laid out: start, then end. */
const triggerIcons = (): SVGSVGElement[] =>
	Array.from(
		container?.querySelectorAll('[data-part^="toggle:arrow-head-"] svg') ?? [],
	);

/** How one trigger draws itself: the marks it holds and whether it drew a line. */
const describeIcon = (icon: SVGSVGElement) => ({
	dots: icon.querySelectorAll("circle").length,
	hasLine: icon.querySelector("line") !== null,
});

afterEach(() => {
	act(() => {
		root?.unmount();
	});
	container?.remove();
	container = null;
	root = null;
});

describe("ArrowHeadMenu", () => {
	it("draws the mark each end agrees on", () => {
		render(
			<ArrowHeadMenu
				canvasState={stateOf(
					line("a", "None", "FilledTriangle"),
					line("b", "None", "FilledTriangle"),
				)}
			/>,
		);

		expect(triggerIcons().map(describeIcon)).toEqual([
			{ dots: 0, hasLine: true },
			{ dots: 0, hasLine: true },
		]);
	});

	it("draws three dots and no line for the end the selection disagrees about", () => {
		render(
			<ArrowHeadMenu
				canvasState={stateOf(
					line("a", "None", "FilledTriangle"),
					line("b", "None", "Circle"),
				)}
			/>,
		);

		// The start agrees, so it keeps its preview; only the end falls back to the dots.
		expect(triggerIcons().map(describeIcon)).toEqual([
			{ dots: 0, hasLine: true },
			{ dots: 3, hasLine: false },
		]);
	});
});
