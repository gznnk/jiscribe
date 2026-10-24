// @vitest-environment jsdom

import type { CanvasDoc } from "@jiscribe/doc/model/canvas/CanvasDoc";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { Viewport } from "../../../../../../rendering/Viewport";
import type { CanvasControllerState } from "../../../../../CanvasTypes";
import { createTestState } from "../../../../../reducer/__tests__/support/createTestState";
import { selectionOf } from "../../../../../selection/__tests__/support/selectionOf";
import { useObjectMenuPosition } from "../useObjectMenuPosition";

/**
 * Where the ObjectMenu lands relative to the selection and the visible rect
 * (below and centered, flipped above at the bottom edge, pushed in from the
 * sides and the top), and every state that hides it — including the linger
 * that keeps it away for a moment after the view stops moving.
 */

// Without this React treats every `act` below as unsupported and warns.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const roots: { unmount: () => void }[] = [];

afterEach(() => {
	act(() => {
		roots.splice(0).forEach((root) => {
			root.unmount();
		});
	});
	vi.useRealTimers();
});

/** The menu's measured size, stubbed onto its container. */
const MENU_WIDTH = 200;
const MENU_HEIGHT = 40;
/** The gap the hook keeps between the selection and the menu. */
const GAP = 40;

const viewport: Viewport = {
	minX: 0,
	minY: 0,
	width: 800,
	height: 600,
	zoom: 1,
};

const rectDocAt = (
	x: number,
	y: number,
	width: number,
	height: number,
): CanvasDoc =>
	({
		version: 1,
		root: [{ id: "rect-1", type: "rect", x, y, width, height }],
	}) as unknown as CanvasDoc;

/** rect-1 at the given box, selected, under `viewport` unless overridden. */
const selectedRectState = (
	box: [x: number, y: number, width: number, height: number],
	overrides: Partial<CanvasControllerState> = {},
): CanvasControllerState =>
	createTestState(rectDocAt(...box), {
		selection: selectionOf(["rect-1"]),
		viewport,
		...overrides,
	});

const createMenuElement = (): HTMLDivElement => {
	const menuElement = document.createElement("div");
	menuElement.getBoundingClientRect = () =>
		({ width: MENU_WIDTH, height: MENU_HEIGHT }) as DOMRect;
	return menuElement;
};

type Position = ReturnType<typeof useObjectMenuPosition>;

/** Mounts the hook and returns a way to re-render it with another state, reading back the position. */
const mountPosition = (
	initialState: CanvasControllerState,
	isPointerOverMenu = false,
) => {
	const menuRef = { current: createMenuElement() };
	let returned: Position | null = null;
	const Probe = ({ state }: { state: CanvasControllerState }) => {
		returned = useObjectMenuPosition(state, menuRef, isPointerOverMenu);
		return null;
	};
	const root = createRoot(document.createElement("div"));
	roots.push(root);
	const render = (state: CanvasControllerState): Position => {
		act(() => {
			root.render(<Probe state={state} />);
		});
		if (returned === null) {
			throw new Error("the probe did not render");
		}
		return returned;
	};
	return { first: render(initialState), render, read: () => returned };
};

describe("useObjectMenuPosition placement", () => {
	it("centers the menu below the selection", () => {
		const { first } = mountPosition(selectedRectState([300, 100, 100, 50]));
		expect(first).toEqual({
			shouldRender: true,
			x: 350 - MENU_WIDTH / 2,
			y: 150 + GAP,
		});
	});

	it("flips the menu above a selection whose menu would run off the bottom", () => {
		const { first } = mountPosition(selectedRectState([300, 500, 100, 50]));
		expect(first.y).toBe(500 - GAP - MENU_HEIGHT);
	});

	it("pins the menu to the top edge when it fits neither below nor above", () => {
		const { first } = mountPosition(selectedRectState([300, 0, 100, 580]));
		expect(first.y).toBe(0);
	});

	it("pushes the menu in from the right and left edges", () => {
		const right = mountPosition(selectedRectState([750, 100, 40, 40]));
		expect(right.first.x).toBe(800 - MENU_WIDTH);
		const left = mountPosition(selectedRectState([0, 100, 40, 40]));
		expect(left.first.x).toBe(0);
	});

	it("places the menu in zoomed overlay coordinates, bounded by the panned view", () => {
		const { first } = mountPosition(
			selectedRectState([300, 100, 100, 50], {
				viewport: { ...viewport, minX: 100, zoom: 2 },
			}),
		);
		// The selection's center is 350 world = 700 overlay px, its bottom 150 = 300.
		expect(first).toEqual({
			shouldRender: true,
			x: 700 - MENU_WIDTH / 2,
			y: 300 + GAP,
		});
	});
});

describe("useObjectMenuPosition visibility", () => {
	const box: [number, number, number, number] = [300, 100, 100, 50];

	it("hides with nothing selected", () => {
		const { first } = mountPosition(
			createTestState(rectDocAt(...box), { viewport }),
		);
		expect(first.shouldRender).toBe(false);
	});

	it.each<[string, Partial<CanvasControllerState>]>([
		[
			"a context menu is open",
			{ contextMenuPosition: { clientX: 0, clientY: 0 } },
		],
		[
			"a marquee is being drawn",
			{
				// An open dropdown keeps the menu up through other drags, never a marquee.
				objectMenuOpenId: "r1",
				drag: {
					kind: "marquee",
					rect: { startX: 0, startY: 0, endX: 1, endY: 1 },
					hitIds: [],
					baseIds: [],
				} as unknown as CanvasControllerState["drag"],
			},
		],
		[
			"the properties sidebar is open",
			{ propertyPanel: { isOpen: true, collapsedSectionIds: [] } },
		],
		[
			"a connector label is being edited",
			{
				mode: { kind: "textEdit", draft: { kind: "connectorLabel", text: "" } },
			},
		],
	])("hides while %s", (_condition, overrides) => {
		const { first } = mountPosition(selectedRectState(box, overrides));
		expect(first.shouldRender).toBe(false);
	});

	it("stays away for a moment after the view stops coasting, then comes back", () => {
		vi.useFakeTimers();
		const { first, render, read } = mountPosition(
			selectedRectState(box, { inertialScrolling: true }),
		);
		expect(first.shouldRender).toBe(false);

		expect(render(selectedRectState(box)).shouldRender).toBe(false);
		act(() => {
			vi.advanceTimersByTime(199);
		});
		expect(read()?.shouldRender).toBe(false);
		act(() => {
			vi.advanceTimersByTime(1);
		});
		expect(read()?.shouldRender).toBe(true);
	});
});

describe("useObjectMenuPosition anchor latch", () => {
	it("holds the anchor while a dropdown is open, and re-takes it once it closes", () => {
		const menuOpen = { objectMenuOpenId: "fontSize" };
		const { first, render } = mountPosition(
			selectedRectState([300, 100, 100, 50], menuOpen),
		);
		const grown = render(selectedRectState([300, 100, 100, 150], menuOpen));
		expect(grown).toEqual(first);

		const closed = render(selectedRectState([300, 100, 100, 150]));
		expect(closed.y).toBe(250 + GAP);
	});

	it("holds the anchor while the pointer rests on the menu", () => {
		const { first, render } = mountPosition(
			selectedRectState([300, 100, 100, 50]),
			true,
		);
		expect(render(selectedRectState([300, 100, 100, 150]))).toEqual(first);
	});
});
