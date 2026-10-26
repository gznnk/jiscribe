// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import { CanvasViewportElementRefContext } from "../../../../../CanvasViewportElementRefContext";
import { useSubmenuPosition } from "../useSubmenuPosition";

/**
 * Where an ObjectMenu dropdown opens relative to its button: down and centered,
 * flipped up only when it overflows the bottom and fits above, and shifted
 * sideways by the overflow — the left edge winning when it fits on neither side.
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

const stubRect = (element: HTMLElement, rect: Partial<DOMRect>) => {
	element.getBoundingClientRect = () => rect as DOMRect;
};

/** The canvas area: 0..800 × 0..600 in client px. */
const canvasArea = document.createElement("div");
stubRect(canvasArea, { left: 0, top: 0, right: 800, bottom: 600 });

type ButtonRect = { left: number; top: number; right: number; bottom: number };
type SubmenuSize = { width: number; height: number };

/**
 * Mounts the hook closed, stubs the button's and the submenu's measured boxes,
 * then opens it and reads back where it placed the submenu.
 */
const openSubmenu = (buttonRect: ButtonRect, submenuSize: SubmenuSize) => {
	const menuItemElement = document.createElement("div");
	stubRect(menuItemElement, buttonRect);
	const menuItemRef = { current: menuItemElement };
	let returned: ReturnType<typeof useSubmenuPosition> | null = null;
	const Probe = ({ isOpen }: { isOpen: boolean }) => {
		returned = useSubmenuPosition(menuItemRef, isOpen);
		return <div ref={returned.submenuRef} />;
	};
	const root = createRoot(document.createElement("div"));
	roots.push(root);
	const render = (isOpen: boolean) => {
		act(() => {
			root.render(
				<CanvasViewportElementRefContext.Provider
					value={{ current: canvasArea }}
				>
					<Probe isOpen={isOpen} />
				</CanvasViewportElementRefContext.Provider>,
			);
		});
		if (returned === null) {
			throw new Error("the probe did not render");
		}
		return returned;
	};
	const closed = render(false);
	if (closed.submenuRef.current === null) {
		throw new Error("the submenu element did not mount");
	}
	stubRect(closed.submenuRef.current, submenuSize);
	const opened = render(true);
	return {
		placement: opened.placement,
		offsetX: opened.offsetX,
		close: () => render(false),
	};
};

/** A 40×40 button centered at x=400, its top at `top`. */
const buttonAt = (top: number, centerX = 400): ButtonRect => ({
	left: centerX - 20,
	right: centerX + 20,
	top,
	bottom: top + 40,
});

describe("useSubmenuPosition", () => {
	it("opens down and centered when it fits", () => {
		const { placement, offsetX } = openSubmenu(buttonAt(100), {
			width: 200,
			height: 200,
		});
		expect({ placement, offsetX }).toEqual({ placement: "down", offsetX: 0 });
	});

	it("flips up when it would overflow the bottom and fits above", () => {
		expect(
			openSubmenu(buttonAt(450), { width: 200, height: 200 }).placement,
		).toBe("up");
	});

	it("stays down when it fits neither below nor above", () => {
		expect(
			openSubmenu(buttonAt(250), { width: 200, height: 500 }).placement,
		).toBe("down");
	});

	it("shifts left by the right-edge overflow, and right by the left-edge one", () => {
		expect(
			openSubmenu(buttonAt(100, 750), { width: 200, height: 100 }).offsetX,
		).toBe(800 - MARGIN - 850);
		expect(
			openSubmenu(buttonAt(100, 50), { width: 200, height: 100 }).offsetX,
		).toBe(MARGIN - -50);
	});

	it("lets the left edge win when the submenu is wider than the area", () => {
		expect(
			openSubmenu(buttonAt(100), { width: 900, height: 100 }).offsetX,
		).toBe(MARGIN - (400 - 450));
	});

	it("returns to the default placement once closed", () => {
		const { close } = openSubmenu(buttonAt(450, 750), {
			width: 200,
			height: 200,
		});
		const closed = close();
		expect({ placement: closed.placement, offsetX: closed.offsetX }).toEqual({
			placement: "down",
			offsetX: 0,
		});
	});
});
