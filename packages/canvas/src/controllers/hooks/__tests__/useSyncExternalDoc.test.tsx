// @vitest-environment jsdom

import type { CanvasDoc } from "@jiscribe/doc/model/canvas/CanvasDoc";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { CanvasControllerState } from "../../CanvasTypes";
import type { CanvasAction } from "../../reducer/CanvasActions";
import { createCanvasReducer } from "../../reducer/canvasReducer";
import { createInitialControllerState } from "../../reducer/createInitialControllerState";
import { createTestRegistries } from "../../registries/createCanvasRegistries";
import { useSyncExternalDoc } from "../useSyncExternalDoc";
import { createSelfSaveNonceTracker } from "../utils/createSelfSaveNonceTracker";

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
 * Mounts the hook against a canvas state built from `initialDoc` (or the
 * `canvasState` given), and returns the
 * dispatch spy plus a way to re-render with whatever the host passes next. The
 * state stays put across re-renders, as it does in production until the reducer
 * has run — dispatch is a spy here, so nothing is ever applied.
 */
const mountWithDoc = (
	initialDoc: CanvasDoc,
	initialDocLoadId?: string,
	canvasState: CanvasControllerState = createInitialControllerState(
		initialDoc,
		registries,
	),
) => {
	const dispatch = vi.fn<(action: CanvasAction) => void>();
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

	it("skips the host's own doc echoed back after an undo to the opened document", () => {
		// More decimals than a save writes and a default spelled out: what the
		// opened entry keeps verbatim, and a rebuild of it would not.
		const openedDoc = (): CanvasDoc =>
			({
				version: 1,
				root: [
					{
						id: "rect-1",
						type: "rect",
						x: 0.123456,
						y: 0,
						width: 10,
						height: 10,
						rotation: 0,
					},
				],
			}) as unknown as CanvasDoc;
		const reducer = createCanvasReducer(registries);
		const opened = createInitialControllerState(openedDoc(), registries);
		const moved = reducer(
			reducer(opened, { type: "SET_SELECTION", ids: ["rect-1"] }),
			{ type: "COMMAND", commandId: "move-right" },
		);
		const undone = reducer(moved, { type: "COMMAND", commandId: "undo" });
		expect(undone.history.past).toHaveLength(0);

		const { dispatch, syncFromHost } = mountWithDoc(
			openedDoc(),
			"file-a",
			undone,
		);
		syncFromHost(openedDoc(), "file-a");

		expect(dispatch).not.toHaveBeenCalled();
	});
	it("skips a doc that differs from the one on screen in key order only", () => {
		const { dispatch, syncFromHost } = mountWithDoc(docWithRectAt(0), "file-a");

		syncFromHost(
			{
				root: [
					{ height: 10, width: 10, y: 0, x: 0, type: "rect", id: "rect-1" },
				],
				version: 1,
			} as unknown as CanvasDoc,
			"file-a",
		);

		expect(dispatch).not.toHaveBeenCalled();
	});

	it("syncs an edit keeping the objects it leaves alone, along with the host's doc", () => {
		const twoRectsAt = (x: number): CanvasDoc =>
			({
				version: 1,
				root: [
					{ id: "rect-1", type: "rect", x, y: 0, width: 10, height: 10 },
					{ id: "rect-2", type: "rect", x: 100, y: 0, width: 10, height: 10 },
				],
			}) as unknown as CanvasDoc;
		const canvasState = createInitialControllerState(twoRectsAt(0), registries);
		const { dispatch, syncFromHost } = mountWithDoc(
			twoRectsAt(0),
			"file-a",
			canvasState,
		);

		const editedDoc = twoRectsAt(50);
		syncFromHost(editedDoc, "file-a");

		const action = dispatch.mock.calls[0][0];
		if (action.type !== "SYNC_EXTERNAL") {
			throw new Error(`expected SYNC_EXTERNAL, got ${action.type}`);
		}
		expect(action.doc).toBe(editedDoc);
		expect(action.payload.objects["rect-2"]).toBe(
			canvasState.objects["rect-2"],
		);
		expect(action.payload.objects["rect-1"]).not.toBe(
			canvasState.objects["rect-1"],
		);
	});

	it("loads another document without reusing any object of the one on screen", () => {
		const canvasState = createInitialControllerState(
			docWithRectAt(0),
			registries,
		);
		const { dispatch, syncFromHost } = mountWithDoc(
			docWithRectAt(0),
			"file-a",
			canvasState,
		);

		const loadedDoc = docWithRectAt(0);
		syncFromHost(loadedDoc, "file-b");

		const action = dispatch.mock.calls[0][0];
		if (action.type !== "LOAD_DOCUMENT") {
			throw new Error(`expected LOAD_DOCUMENT, got ${action.type}`);
		}
		expect(action.doc).toBe(loadedDoc);
		expect(action.payload.objects["rect-1"]).not.toBe(
			canvasState.objects["rect-1"],
		);
	});
});
