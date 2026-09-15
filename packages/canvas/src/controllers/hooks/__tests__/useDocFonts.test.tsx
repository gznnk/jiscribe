// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { DocFontRequest } from "../../utils/collectDocFontRequests";
import { useDocFonts } from "../useDocFonts";

/**
 * The two font signals folded into one. jsdom carries no `document.fonts`, so
 * the FontFaceSet is stood in for: what is under test is that both signals reach
 * the same counter and the same callback, not the browser's fetching.
 */

const requests: DocFontRequest[] = [
	{
		fontStyle: "normal",
		fontWeight: "normal",
		fontFamily: '"Source Sans 3", "Noto Sans JP", sans-serif',
		text: "あA",
	},
];

/**
 * A FontFaceSet stand-in driven by hand: `load` calls are settled through
 * `resolveAll`, and the later arrivals the nonce watches through
 * `fireLoadingDone`. `ready` never settles, so the preload and the nonce can be
 * moved one at a time.
 */
const stubFontFaceSet = () => {
	const resolvers: Array<() => void> = [];
	const listeners = new Set<() => void>();
	Object.defineProperty(document, "fonts", {
		configurable: true,
		value: {
			ready: new Promise<void>(() => {}),
			addEventListener: (_type: string, listener: () => void) => {
				listeners.add(listener);
			},
			removeEventListener: (_type: string, listener: () => void) => {
				listeners.delete(listener);
			},
			load: () =>
				new Promise<FontFace[]>((resolve) => {
					resolvers.push(() => resolve([]));
				}),
		},
	});
	return {
		resolveAll: () => resolvers.forEach((resolve) => resolve()),
		fireLoadingDone: () => {
			for (const listener of [...listeners]) {
				listener();
			}
		},
	};
};

/** Mounts the hook and reports every value it has returned, newest last. */
const renderHook = (onFacesChanged?: () => void) => {
	const seen: { fontsNonce: number; isContentHidden: boolean }[] = [];
	const Probe = () => {
		seen.push(useDocFonts({ collectRequests: () => requests, onFacesChanged }));
		return null;
	};
	const root = createRoot(document.createElement("div"));
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

describe("useDocFonts", () => {
	it("reveals the content and moves the counter in the one commit the preload settles in", async () => {
		const stub = stubFontFaceSet();
		const onFacesChanged = vi.fn();
		const probe = renderHook(onFacesChanged);
		const rendersBefore = probe.seen.length;

		expect(probe.latest()).toEqual({ fontsNonce: 0, isContentHidden: true });

		await act(async () => {
			stub.resolveAll();
		});

		expect(onFacesChanged).toHaveBeenCalledTimes(1);
		expect(probe.seen.length).toBe(rendersBefore + 1);
		expect(probe.latest()).toEqual({ fontsNonce: 1, isContentHidden: false });
		probe.unmount();
	});

	it("moves the counter again for a face arriving after the gate opened", async () => {
		const stub = stubFontFaceSet();
		const onFacesChanged = vi.fn();
		const probe = renderHook(onFacesChanged);
		await act(async () => {
			stub.resolveAll();
		});

		act(() => stub.fireLoadingDone());

		expect(onFacesChanged).toHaveBeenCalledTimes(2);
		// The content stays visible: the gate only ever opens once.
		expect(probe.latest()).toEqual({ fontsNonce: 2, isContentHidden: false });
		probe.unmount();
	});

	it("shows the content from the first render where there is no FontFaceSet to ask", () => {
		const onFacesChanged = vi.fn();
		const probe = renderHook(onFacesChanged);

		expect(probe.seen).toEqual([{ fontsNonce: 1, isContentHidden: false }]);
		// The first measurement is already the final one, so nothing is invalidated.
		expect(onFacesChanged).not.toHaveBeenCalled();
		probe.unmount();
	});
});
