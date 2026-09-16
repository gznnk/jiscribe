// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import { useBlockBrowserZoom } from "../useBlockBrowserZoom";

/**
 * The hook exists for the wheel the canvas itself never sees: one over the toolbar
 * or a sidebar, which the browser would otherwise take as a page zoom. So what is
 * checked here is which events come back cancelled, and that the listener is gone
 * once the canvas unmounts.
 */

// Without this React treats every `act` below as unsupported and warns, the
// flushes being correct all the same.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const roots: { unmount: () => void }[] = [];

/** Mounts the hook on a root element holding one child, as the chrome is. */
const mountOnRoot = () => {
	const rootElement = document.createElement("div");
	const chromeElement = document.createElement("button");
	rootElement.appendChild(chromeElement);
	document.body.appendChild(rootElement);

	const Probe = () => {
		useBlockBrowserZoom({ current: rootElement });
		return null;
	};

	const root = createRoot(document.createElement("div"));
	roots.push(root);
	act(() => {
		root.render(<Probe />);
	});

	return {
		rootElement,
		chromeElement,
		/** Fires a wheel on the child and reports whether it came back cancelled. */
		wheelOnChrome: (ctrlKey: boolean) => {
			const event = new WheelEvent("wheel", {
				ctrlKey,
				bubbles: true,
				cancelable: true,
			});
			chromeElement.dispatchEvent(event);
			return event.defaultPrevented;
		},
		unmount: () => {
			act(() => {
				root.unmount();
			});
		},
	};
};

afterEach(() => {
	act(() => {
		roots.splice(0).forEach((root) => {
			root.unmount();
		});
	});
	document.body.replaceChildren();
});

describe("useBlockBrowserZoom", () => {
	it("cancels a Ctrl-held wheel over the chrome, which is the browser's zoom", () => {
		const { wheelOnChrome } = mountOnRoot();

		expect(wheelOnChrome(true)).toBe(true);
	});

	it("leaves a plain wheel alone so a sidebar's list still scrolls natively", () => {
		const { wheelOnChrome } = mountOnRoot();

		expect(wheelOnChrome(false)).toBe(false);
	});

	it("stops cancelling once unmounted", () => {
		const { wheelOnChrome, unmount } = mountOnRoot();
		expect(wheelOnChrome(true)).toBe(true);

		unmount();

		expect(wheelOnChrome(true)).toBe(false);
	});
});
