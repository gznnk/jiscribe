// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { CanvasAction } from "../../reducer/CanvasActions";
import { useCloseOtherShapesPopoverOnEscape } from "../useCloseOtherShapesPopoverOnEscape";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const unmounts: (() => void)[] = [];

afterEach(() => {
	unmounts.splice(0).forEach((unmount) => unmount());
	document.body.innerHTML = "";
});

/** Mounts the hook on a root holding a search field, as the canvas holds the popover's. */
const mountOnRoot = (isOpen: boolean) => {
	const rootElement = document.createElement("div");
	const fieldElement = document.createElement("input");
	rootElement.appendChild(fieldElement);
	document.body.appendChild(rootElement);
	const dispatch = vi.fn<(action: CanvasAction) => void>();
	const rootListener = vi.fn();
	rootElement.addEventListener("keydown", rootListener);

	const Probe = () => {
		useCloseOtherShapesPopoverOnEscape(
			{ current: rootElement },
			isOpen,
			dispatch,
		);
		return null;
	};
	const root = createRoot(document.createElement("div"));
	act(() => root.render(<Probe />));
	unmounts.push(() => act(() => root.unmount()));

	const pressInField = (init: KeyboardEventInit) => {
		const event = new KeyboardEvent("keydown", {
			bubbles: true,
			cancelable: true,
			...init,
		});
		fieldElement.dispatchEvent(event);
		return event;
	};
	return { dispatch, rootListener, pressInField };
};

describe("useCloseOtherShapesPopoverOnEscape", () => {
	it("closes the popover on Escape and keeps the key from the canvas's shortcuts", () => {
		const { dispatch, rootListener, pressInField } = mountOnRoot(true);
		const event = pressInField({ key: "Escape" });
		expect(dispatch).toHaveBeenCalledWith({
			type: "CLOSE_OTHER_SHAPES_POPOVER",
		});
		expect(event.defaultPrevented).toBe(true);
		expect(rootListener).not.toHaveBeenCalled();
	});

	it("leaves an Escape that ends an IME composition to the field", () => {
		const { dispatch, rootListener, pressInField } = mountOnRoot(true);
		const event = pressInField({ key: "Escape", isComposing: true });
		expect(dispatch).not.toHaveBeenCalled();
		expect(event.defaultPrevented).toBe(false);
		expect(rootListener).toHaveBeenCalled();
	});

	it("listens to nothing while the popover is closed", () => {
		const { dispatch, rootListener, pressInField } = mountOnRoot(false);
		pressInField({ key: "Escape" });
		expect(dispatch).not.toHaveBeenCalled();
		expect(rootListener).toHaveBeenCalled();
	});
});
