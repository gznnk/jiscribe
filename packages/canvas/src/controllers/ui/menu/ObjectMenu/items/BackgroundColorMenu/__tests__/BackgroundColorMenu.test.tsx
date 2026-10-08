// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ObjectState } from "../../../../../../../states/objects/base/ObjectState";
import type { CanvasControllerState } from "../../../../../../CanvasTypes";
import { defaultCanvasRegistries } from "../../../../../../registries/createCanvasRegistries";
import { selectionOf } from "../../../../../../selection/__tests__/support/selectionOf";
import { readSelectionStyle } from "../../../../../../style/readSelectionStyle";
import { SelectionStyleReaderContext } from "../../../../../../style/SelectionStyleReaderContext";
import { BackgroundColorMenu } from "../BackgroundColorMenu";

// Without this React treats every `act` below as unsupported and warns, the
// flushes being correct all the same.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const GREEN = "#22c55e";
const BLUE = "#3b82f6";

/** A shape declaring both style groups, the way a rect's features do. */
const rect = (id: string, fill: string): ObjectState =>
	({
		id,
		type: "rect",
		features: { type: "rect", geometry: "rect", stroke: true, fill: true },
		fill,
	}) as unknown as ObjectState;

/** The selection with the menu's dropdown open, so the picker grid is drawn too. */
const stateOf = (...shapes: ObjectState[]): CanvasControllerState =>
	({
		selection: selectionOf(shapes.map((shape) => shape.id)),
		objectMenuOpenId: "bg-color",
		objects: Object.fromEntries(shapes.map((shape) => [shape.id, shape])),
	}) as unknown as CanvasControllerState;

let container: HTMLDivElement | null = null;
let root: ReturnType<typeof createRoot> | null = null;

/** Renders the menu for `canvasState`, under the reader the ObjectMenu provides. */
const render = (canvasState: CanvasControllerState): HTMLDivElement => {
	if (!container) {
		container = document.createElement("div");
		document.body.appendChild(container);
		root = createRoot(container);
	}
	const mounted = root;
	act(() => {
		mounted?.render(
			<SelectionStyleReaderContext.Provider
				value={(kind) =>
					readSelectionStyle(canvasState, kind, defaultCanvasRegistries)
				}
			>
				<BackgroundColorMenu
					canvasState={canvasState}
					onStyleIntent={vi.fn()}
				/>
			</SelectionStyleReaderContext.Provider>,
		);
	});
	return container;
};

/** The trigger's icon: the first svg, drawn before the dropdown panel. */
const triggerIcon = (): SVGSVGElement => {
	const icon = container?.querySelector("svg");
	if (!icon) {
		throw new Error("the menu did not render its trigger icon");
	}
	return icon;
};

/** The swatches that write nothing, which is how the grid marks the color already shared. */
const optedOutSwatches = (): string[] =>
	Array.from(container?.querySelectorAll('[data-part^="set:fill:"]') ?? [])
		.filter((element) => element.getAttribute("data-gesture") === "none")
		.map((element) => element.getAttribute("data-part") ?? "");

afterEach(() => {
	act(() => {
		root?.unmount();
	});
	container?.remove();
	container = null;
	root = null;
});

describe("BackgroundColorMenu", () => {
	it("shows the color the selection agrees on, and lets a pick of it write nothing", () => {
		render(stateOf(rect("a", GREEN), rect("b", GREEN)));

		const circle = triggerIcon().querySelector("circle");
		expect(circle?.style.fill).toBe("rgb(34, 197, 94)");
		expect(optedOutSwatches()).toEqual([`set:fill:${GREEN}`]);
	});

	it("splits the icon between the selection's colors and leaves every swatch unpicked while they disagree", () => {
		render(stateOf(rect("a", GREEN), rect("b", BLUE), rect("c", GREEN)));

		// One slice per distinct color, in selection order, not the first shape's color alone.
		const slices = Array.from(
			triggerIcon().querySelectorAll("path"),
			(slice) => slice.style.fill,
		);
		expect(slices).toEqual(["rgb(34, 197, 94)", "rgb(59, 130, 246)"]);
		// Neither color is the selection's, so a pick of either writes to all.
		expect(optedOutSwatches()).toEqual([]);
	});
});
