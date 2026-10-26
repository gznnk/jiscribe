// @vitest-environment jsdom

import type { CanvasDoc } from "@jiscribe/doc/model/canvas/CanvasDoc";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";

import { createTestSnapshot } from "../../__tests__/support/createTestSnapshot";
import type { CanvasControllerState } from "../../CanvasTypes";
import { createInitialControllerState } from "../../reducer/createInitialControllerState";
import { createTestRegistries } from "../../registries/createCanvasRegistries";
import { useNotifySaveRequest } from "../useNotifySaveRequest";
import { createSelfSaveNonceTracker } from "../utils/createSelfSaveNonceTracker";

/**
 * The hook's wiring around the scheduler (whose timing rules are tested on
 * their own): a discrete commit reaches the host at once, a coalescing one waits
 * for keyup / blur / unmount and then delivers the latest commit rather than
 * the one that scheduled it, and every delivered nonce is registered as a
 * self-save.
 */

// Without this React treats every `act` below as unsupported and warns.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const registries = createTestRegistries();

const emptyDoc = (): CanvasDoc => ({ version: 1, root: [] }) as CanvasDoc;

const initialState = createInitialControllerState(emptyDoc(), registries);

/** The state after the `version`-th save request, its present holding `doc`. */
const committedState = (
	version: number,
	doc: CanvasDoc,
	isCoalescing: boolean,
): CanvasControllerState => ({
	...initialState,
	saveRequest: { version, nonce: `nonce-${version}` },
	historyCoalesce: {
		recorded: isCoalescing ? { key: "move:rect-1", time: version } : null,
		pending: null,
	},
	history: { ...initialState.history, present: createTestSnapshot(doc, doc) },
});

/**
 * Mounts the hook on a probe driven by re-rendering. A fresh callback is passed
 * on every render, as a host that does not memoize its own would.
 */
const renderHook = () => {
	const onCommit = vi.fn<(doc: CanvasDoc, saveNonce: string) => void>();
	const selfSaveNonceTracker = createSelfSaveNonceTracker();
	const Probe = ({ state }: { state: CanvasControllerState }) => {
		useNotifySaveRequest(
			state,
			(doc, saveNonce) => onCommit(doc, saveNonce),
			selfSaveNonceTracker,
			registries,
		);
		return null;
	};
	const root = createRoot(document.createElement("div"));
	act(() => root.render(<Probe state={initialState} />));
	return {
		onCommit,
		selfSaveNonceTracker,
		rerender: (state: CanvasControllerState) =>
			act(() => root.render(<Probe state={state} />)),
		unmount: () => act(() => root.unmount()),
	};
};

const pressAndReleaseKey = () => {
	act(() => {
		document.dispatchEvent(new KeyboardEvent("keyup", { code: "ArrowRight" }));
	});
};

describe("useNotifySaveRequest", () => {
	it("delivers nothing before the first save request", () => {
		const { onCommit, unmount } = renderHook();
		pressAndReleaseKey();
		unmount();
		expect(onCommit).not.toHaveBeenCalled();
	});

	it("delivers a discrete commit at once and registers its nonce as a self-save", () => {
		const { onCommit, selfSaveNonceTracker, rerender, unmount } = renderHook();
		const doc = emptyDoc();
		rerender(committedState(1, doc, false));
		expect(onCommit.mock.calls).toEqual([[doc, "nonce-1"]]);
		expect(selfSaveNonceTracker.consumeIfSelfSave("nonce-1")).toBe(true);
		unmount();
	});

	it("holds a coalescing chain until keyup, then delivers its latest commit once", () => {
		const { onCommit, rerender, unmount } = renderHook();
		const lastDoc = emptyDoc();
		rerender(committedState(1, emptyDoc(), true));
		rerender(committedState(2, lastDoc, true));
		expect(onCommit).not.toHaveBeenCalled();

		pressAndReleaseKey();
		expect(onCommit.mock.calls).toEqual([[lastDoc, "nonce-2"]]);

		pressAndReleaseKey();
		unmount();
		expect(onCommit).toHaveBeenCalledTimes(1);
	});

	it("flushes a pending chain when the window loses focus", () => {
		const { onCommit, rerender, unmount } = renderHook();
		const doc = emptyDoc();
		rerender(committedState(1, doc, true));
		act(() => {
			window.dispatchEvent(new Event("blur"));
		});
		expect(onCommit.mock.calls).toEqual([[doc, "nonce-1"]]);
		unmount();
	});

	it("flushes a pending chain on unmount so the last nudge is not lost", () => {
		const { onCommit, rerender, unmount } = renderHook();
		const doc = emptyDoc();
		rerender(committedState(1, doc, true));
		unmount();
		expect(onCommit.mock.calls).toEqual([[doc, "nonce-1"]]);
	});

	it("does not resend a save when only the callback identity changes", () => {
		const { onCommit, rerender, unmount } = renderHook();
		const state = committedState(1, emptyDoc(), false);
		rerender(state);
		rerender(state);
		rerender({ ...state });
		expect(onCommit).toHaveBeenCalledTimes(1);
		unmount();
	});
});
