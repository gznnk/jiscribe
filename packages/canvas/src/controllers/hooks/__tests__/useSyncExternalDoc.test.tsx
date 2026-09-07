// @vitest-environment jsdom

import type { CanvasDoc } from "@jiscribe/doc/model/canvas/CanvasDoc";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { CanvasAction } from "../../reducer/CanvasActions";
import { createInitialControllerState } from "../../reducer/createInitialControllerState";
import { createTestRegistries } from "../../registries/createCanvasRegistries";
import { createSelfSaveNonceTracker } from "../support/createSelfSaveNonceTracker";
import { useSyncExternalDoc } from "../useSyncExternalDoc";

/**
 * What the hook decides is *which* action an incoming doc becomes — an edit to
 * the document on screen (SYNC_EXTERNAL, history kept) or another document taking
 * its place (LOAD_DOCUMENT, history dropped). The reducer's side of that split is
 * covered by canvasReducer.externalSync.test.ts, so these only watch dispatch.
 */

// Without this React treats every `act` below as unsupported and warns, the
// flushes being correct all the same.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const registries = createTestRegistries();

/** One rect at the given x; two docs with the same x are content-identical. */
const docWithRectAt = (x: number): CanvasDoc =>
	({
		version: 1,
		root: [{ id: "rect-1", type: "rect", x, y: 0, width: 10, height: 10 }],
	}) as unknown as CanvasDoc;

const roots: { unmount: () => void }[] = [];

/**
 * Mounts the hook against a canvas state built from `initialDoc`, and returns the
 * dispatch spy plus a way to re-render with whatever the host passes next. The
 * state stays put across re-renders, as it does in production until the reducer
 * has run — dispatch is a spy here, so nothing is ever applied.
 */
const mountWithDoc = (initialDoc: CanvasDoc, initialDocLoadId?: string) => {
	const dispatch = vi.fn<(action: CanvasAction) => void>();
	const canvasState = createInitialControllerState(initialDoc, registries);
	const selfSaveNonceTracker = createSelfSaveNonceTracker();

	const Probe = ({
		doc,
		docLoadId,
	}: {
		doc: CanvasDoc;
		docLoadId: string | undefined;
	}) => {
		useSyncExternalDoc({
			canvasDoc: doc,
			syncNonce: undefined,
			docLoadId,
			canvasState,
			dispatch,
			resetGestureState: () => {},
			selfSaveNonceTracker,
			registries,
		});
		return null;
	};

	const host = document.createElement("div");
	const root = createRoot(host);
	roots.push(root);
	const syncFromHost = (doc: CanvasDoc, docLoadId?: string) => {
		act(() => {
			root.render(<Probe doc={doc} docLoadId={docLoadId} />);
		});
	};
	syncFromHost(initialDoc, initialDocLoadId);

	return { dispatch, syncFromHost };
};

afterEach(() => {
	act(() => {
		roots.splice(0).forEach((root) => {
			root.unmount();
		});
	});
});

describe("useSyncExternalDoc", () => {
	it("ignores the doc it was mounted with (the reducer already holds it)", () => {
		const { dispatch } = mountWithDoc(docWithRectAt(0), "file-a");
		expect(dispatch).not.toHaveBeenCalled();
	});

	it("loads the document when the host reports another load", () => {
		const { dispatch, syncFromHost } = mountWithDoc(docWithRectAt(0), "file-a");

		syncFromHost(docWithRectAt(50), "file-b");

		expect(dispatch).toHaveBeenCalledTimes(1);
		expect(dispatch.mock.calls[0][0].type).toBe("LOAD_DOCUMENT");
	});

	it("syncs an edit to the same load as an external change", () => {
		const { dispatch, syncFromHost } = mountWithDoc(docWithRectAt(0), "file-a");

		syncFromHost(docWithRectAt(50), "file-a");

		expect(dispatch).toHaveBeenCalledTimes(1);
		expect(dispatch.mock.calls[0][0].type).toBe("SYNC_EXTERNAL");
	});

	it("loads a document that reads the same as the one on screen", () => {
		const { dispatch, syncFromHost } = mountWithDoc(docWithRectAt(0), "file-a");

		// Identical content is skipped outright while the load holds, so this is the
		// case that only the load id can tell apart.
		syncFromHost(docWithRectAt(0), "file-a");
		expect(dispatch).not.toHaveBeenCalled();

		syncFromHost(docWithRectAt(0), "file-b");
		expect(dispatch).toHaveBeenCalledTimes(1);
		expect(dispatch.mock.calls[0][0].type).toBe("LOAD_DOCUMENT");
	});

	it("treats every doc as an external change for a host that passes no load id", () => {
		const { dispatch, syncFromHost } = mountWithDoc(docWithRectAt(0));

		syncFromHost(docWithRectAt(50));
		syncFromHost(docWithRectAt(100));

		expect(dispatch).toHaveBeenCalledTimes(2);
		expect(dispatch.mock.calls.map((call) => call[0].type)).toEqual([
			"SYNC_EXTERNAL",
			"SYNC_EXTERNAL",
		]);
	});
});
