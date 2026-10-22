// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import { CanvasViewportElementRefContext } from "../../../../CanvasViewportElementRefContext";
import { useContextMenuPosition } from "../useContextMenuPosition";

/**
 * Where the context menu opens relative to the click: right of and below it,
 * flipped to the other side of the click on an axis it would overflow, and
 * clamped inside the canvas area (with its 8px margin) when neither side fits.
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
});

const MARGIN = 8;

/** An element whose bounding rect is stubbed to `rect`. */
const elementWithRect = (rect: Partial<DOMRect>): HTMLDivElement => {
	const element = document.createElement("div");
	element.getBoundingClientRect = () => rect as DOMRect;
	return element;
};

/** The canvas area: 100..900 × 50..650 in client px. */
const canvasArea = elementWithRect({
	left: 100,
	top: 50,
	right: 900,
	bottom: 650,
});

const readPosition = (
	click: { clientX: number; clientY: number },
	menuSize: { width: number; height: number },
	areaElement: HTMLDivElement | null = canvasArea,
) => {
	const menuRef = { current: elementWithRect(menuSize) };
	let returned: ReturnType<typeof useContextMenuPosition> | null = null;
	const Probe = () => {
		returned = useContextMenuPosition(click, menuRef);
		return null;
	};
	const root = createRoot(document.createElement("div"));
	roots.push(root);
	act(() => {
		root.render(
			<CanvasViewportElementRefContext.Provider
				value={areaElement === null ? null : { current: areaElement }}
			>
				<Probe />
			</CanvasViewportElementRefContext.Provider>,
		);
	});
	return returned;
};

describe("useContextMenuPosition", () => {
	it("opens at the click when the menu fits right of and below it", () => {
		expect(
			readPosition({ clientX: 300, clientY: 200 }, { width: 150, height: 200 }),
		).toEqual({ left: 300, top: 200 });
	});

	it("flips to the left of and above the click on the axes it would overflow", () => {
		expect(
			readPosition({ clientX: 800, clientY: 550 }, { width: 150, height: 200 }),
		).toEqual({ left: 650, top: 350 });
	});

	it("clamps inside the area when neither side of the click fits", () => {
		// 700 tall from y=400 overflows below; flipped to -300 it overflows above,
		// and the area is too short for it either way, so the top edge wins.
		expect(
			readPosition({ clientX: 120, clientY: 400 }, { width: 150, height: 700 }),
		).toEqual({ left: 120, top: 50 + MARGIN });
	});

	it("bounds the menu by the browser window outside a canvas provider", () => {
		expect(
			readPosition(
				{ clientX: window.innerWidth - 10, clientY: 20 },
				{ width: 100, height: 50 },
				null,
			),
		).toEqual({ left: window.innerWidth - 110, top: 20 });
	});
});
