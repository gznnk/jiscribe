// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { DocFontRequest } from "../../utils/collectDocFontRequests";
import { useDocFontsPreload } from "../useDocFontsPreload";

/**
 * The gate that holds a canvas's content back until the faces it draws in are
 * fetched. jsdom carries no `document.fonts`, so the FontFaceSet is stood in for:
 * what is under test is what gets asked for and when the gate opens, not the
 * browser's fetching.
 */

const requests: DocFontRequest[] = [
	{
		fontStyle: "normal",
		fontWeight: "normal",
		fontFamily: '"Source Sans 3", "Noto Sans JP", sans-serif',
		text: "あA",
	},
];

/** A FontFaceSet stand-in whose `load` calls are recorded and settled by hand. */
const stubFontFaceSet = () => {
	const settlers: Array<{ resolve: () => void; reject: () => void }> = [];
	const load = vi.fn(
		() =>
			new Promise<FontFace[]>((resolve, reject) => {
				settlers.push({
					resolve: () => resolve([]),
					reject: () => reject(new Error("network")),
				});
			}),
	);
	Object.defineProperty(document, "fonts", {
		configurable: true,
		value: { load },
	});
	return {
		load,
		resolveAll: () => settlers.forEach((settler) => settler.resolve()),
		rejectAll: () => settlers.forEach((settler) => settler.reject()),
	};
};

/** Mounts the hook and reports every value it has returned, newest last. */
const renderHook = (onSettled?: () => void, collect = () => requests) => {
	const seen: boolean[] = [];
	const Probe = () => {
		seen.push(useDocFontsPreload(collect, onSettled));
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
	vi.useRealTimers();
	vi.restoreAllMocks();
});

describe("useDocFontsPreload", () => {
	it("is settled from the first render where there is no FontFaceSet to ask", () => {
		const collect = vi.fn(() => requests);
		const probe = renderHook(undefined, collect);

		expect(probe.seen).toEqual([true]);
		// Nothing to fetch, so the document is never even walked.
		expect(collect).not.toHaveBeenCalled();
		probe.unmount();
	});

	it("settles in the mount effect for a document that draws no text", () => {
		const stub = stubFontFaceSet();
		const probe = renderHook(undefined, () => []);

		expect(probe.latest()).toBe(true);
		expect(stub.load).not.toHaveBeenCalled();
		probe.unmount();
	});

	it("collects the faces once, after the first render rather than during it", () => {
		stubFontFaceSet();
		const collect = vi.fn(() => requests);
		const collectedByRender: number[] = [];
		const Probe = () => {
			collectedByRender.push(collect.mock.calls.length);
			useDocFontsPreload(collect);
			return null;
		};
		const root = createRoot(document.createElement("div"));
		act(() => root.render(<Probe />));
		act(() => root.render(<Probe />));

		// Nothing is collected while the first render is still running, which is
		// what lets a caller collect off what that render produced.
		expect(collectedByRender[0]).toBe(0);
		expect(collect).toHaveBeenCalledTimes(1);
		act(() => root.unmount());
	});

	it("asks for each face with the characters it draws, and opens when they arrive", async () => {
		const stub = stubFontFaceSet();
		const probe = renderHook();

		expect(probe.latest()).toBe(false);
		expect(stub.load).toHaveBeenCalledWith(
			'normal normal 16px "Source Sans 3", "Noto Sans JP", sans-serif',
			"あA",
		);

		await act(async () => {
			stub.resolveAll();
		});

		expect(probe.latest()).toBe(true);
		probe.unmount();
	});

	it("opens in a single commit, the re-measure it triggers included", async () => {
		const stub = stubFontFaceSet();
		const onSettled = vi.fn();
		const probe = renderHook(onSettled);
		const rendersBefore = probe.seen.length;

		await act(async () => {
			stub.resolveAll();
		});

		expect(onSettled).toHaveBeenCalledTimes(1);
		expect(probe.seen.length).toBe(rendersBefore + 1);
		expect(probe.latest()).toBe(true);
		probe.unmount();
	});

	it("opens when a face cannot be fetched, since the fallback still draws", async () => {
		const stub = stubFontFaceSet();
		const probe = renderHook();

		await act(async () => {
			stub.rejectAll();
		});

		expect(probe.latest()).toBe(true);
		probe.unmount();
	});

	it("opens on its own once the timeout passes, however slow the faces are", async () => {
		vi.useFakeTimers();
		stubFontFaceSet();
		const probe = renderHook();

		await act(async () => {
			await vi.advanceTimersByTimeAsync(2000);
		});

		expect(probe.latest()).toBe(true);
		probe.unmount();
	});

	it("does not open after unmount, so no state is set on a gone canvas", async () => {
		const stub = stubFontFaceSet();
		const onSettled = vi.fn();
		const probe = renderHook(onSettled);

		probe.unmount();
		await act(async () => {
			stub.resolveAll();
		});

		expect(onSettled).not.toHaveBeenCalled();
		expect(probe.latest()).toBe(false);
	});
});
