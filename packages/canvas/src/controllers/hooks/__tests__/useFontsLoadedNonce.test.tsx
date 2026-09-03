// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useFontsLoadedNonce } from "../useFontsLoadedNonce";

/**
 * The hook a measurement is invalidated by. jsdom carries no `document.fonts`,
 * so the FontFaceSet is stood in for: what is under test is which events are
 * subscribed to and that each one moves the value, not the browser's loading.
 */

/** A FontFaceSet stand-in whose `ready` and `loadingdone` can be driven by hand. */
const stubFontFaceSet = () => {
	let resolveReady = (): void => {};
	const listeners = new Set<() => void>();
	const fonts = {
		ready: new Promise<void>((resolve) => {
			resolveReady = () => resolve();
		}),
		addEventListener: vi.fn((_type: string, listener: () => void) => {
			listeners.add(listener);
		}),
		removeEventListener: vi.fn((_type: string, listener: () => void) => {
			listeners.delete(listener);
		}),
	};
	Object.defineProperty(document, "fonts", {
		configurable: true,
		value: fonts,
	});
	return {
		fonts,
		settleReady: resolveReady,
		fireLoadingDone: () => {
			for (const listener of [...listeners]) {
				listener();
			}
		},
	};
};

/** Mounts the hook and reports every value it has returned, newest last. */
const renderHook = () => {
	const seen: number[] = [];
	const Probe = () => {
		seen.push(useFontsLoadedNonce());
		return null;
	};
	const container = document.createElement("div");
	const root = createRoot(container);
	act(() => root.render(<Probe />));
	return {
		seen,
		latest: () => seen[seen.length - 1],
		unmount: () => act(() => root.unmount()),
	};
};

afterEach(() => {
	// @ts-expect-error jsdom has no `fonts` to restore, so the stub is removed.
	delete document.fonts;
	vi.restoreAllMocks();
});

describe("useFontsLoadedNonce", () => {
	it("starts at zero, so a first paint is not treated as a font arriving", () => {
		stubFontFaceSet();

		const probe = renderHook();

		expect(probe.latest()).toBe(0);
		probe.unmount();
	});

	it("moves when the fonts the first layout asked for settle", async () => {
		const stub = stubFontFaceSet();
		const probe = renderHook();

		await act(async () => {
			stub.settleReady();
		});

		expect(probe.latest()).toBe(1);
		probe.unmount();
	});

	it("moves again for every later load, which is what the unicode-range split produces", async () => {
		const stub = stubFontFaceSet();
		const probe = renderHook();
		await act(async () => {
			stub.settleReady();
		});

		act(() => stub.fireLoadingDone());
		act(() => stub.fireLoadingDone());

		expect(probe.latest()).toBe(3);
		probe.unmount();
	});

	it("drops its listener on unmount, so a later load cannot set state on it", async () => {
		const stub = stubFontFaceSet();
		const probe = renderHook();

		probe.unmount();

		expect(stub.fonts.removeEventListener).toHaveBeenCalledWith(
			"loadingdone",
			expect.any(Function),
		);
		// Nothing is subscribed any more, so this reaches no one.
		act(() => stub.fireLoadingDone());
	});

	it("stays at zero where there is no FontFaceSet to watch", () => {
		const probe = renderHook();

		expect(probe.latest()).toBe(0);
		probe.unmount();
	});
});
