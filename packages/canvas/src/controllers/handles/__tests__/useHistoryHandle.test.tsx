// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createTestSnapshot } from "../../__tests__/support/createTestSnapshot";
import type { CanvasControllerState } from "../../CanvasTypes";
import { twoRectsWithConnectorDoc } from "../../commands/__tests__/support/fixtures";
import { createTestState } from "../../reducer/__tests__/support/createTestState";
import type { CanvasAction } from "../../reducer/CanvasActions";
import type { CanvasRegistries } from "../../registries/CanvasRegistries";
import {
	createCanvasRegistries,
	createTestRegistries,
} from "../../registries/createCanvasRegistries";
import {
	type CanvasHistoryHandle,
	useHistoryHandle,
} from "../useHistoryHandle";

/**
 * The handle's gating, which the e2e suite cannot reach on a fully configured
 * canvas: a canvas configured without the undo command offers no undo, redo or
 * revert through the handle either, and what it refuses it never dispatches.
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

const olderEntry = createTestSnapshot(twoRectsWithConnectorDoc);
const newerEntry = createTestSnapshot(twoRectsWithConnectorDoc);

/** A canvas one entry past `olderEntry`, with `newerEntry` redoable. */
const stateWithHistory = (): CanvasControllerState => {
	const base = createTestState(twoRectsWithConnectorDoc);
	return {
		...base,
		history: {
			past: [olderEntry],
			present: base.history.present,
			future: [newerEntry],
		},
	};
};

const mountHandle = (
	canvasState: CanvasControllerState,
	registries: CanvasRegistries,
) => {
	const dispatch = vi.fn<(action: CanvasAction) => void>();
	let returned: CanvasHistoryHandle | null = null;
	const Probe = () => {
		returned = useHistoryHandle(dispatch, canvasState, registries);
		return null;
	};
	const root = createRoot(document.createElement("div"));
	roots.push(root);
	act(() => {
		root.render(<Probe />);
	});
	if (returned === null) {
		throw new Error("the probe did not render");
	}
	return { dispatch, handle: returned as CanvasHistoryHandle };
};

describe("useHistoryHandle", () => {
	it("undoes, redoes and reverts through the reducer on a fully configured canvas", () => {
		const { dispatch, handle } = mountHandle(
			stateWithHistory(),
			createTestRegistries(),
		);
		expect(handle.canUndo()).toBe(true);
		expect(handle.canRedo()).toBe(true);
		expect(handle.undo()).toBe(true);
		expect(handle.redo()).toBe(true);
		expect(handle.revertTo({ entry: olderEntry.source })).toBe(true);
		expect(dispatch.mock.calls.map(([action]) => action)).toEqual([
			{ type: "COMMAND", commandId: "undo" },
			{ type: "COMMAND", commandId: "redo" },
			{ type: "REVERT_HISTORY", entry: olderEntry.source },
		]);
	});

	it("offers neither undo, redo nor revert when the canvas has no history commands", () => {
		const { dispatch, handle } = mountHandle(
			stateWithHistory(),
			createCanvasRegistries({ commands: [] }),
		);
		expect(handle.canUndo()).toBe(false);
		expect(handle.canRedo()).toBe(false);
		expect(handle.undo()).toBe(false);
		expect(handle.redo()).toBe(false);
		expect(handle.revertTo({ entry: olderEntry.source })).toBe(false);
		expect(dispatch).not.toHaveBeenCalled();
	});

	it("refuses a redoable entry as a revert target, since only the past is reachable by undo", () => {
		const { dispatch, handle } = mountHandle(
			stateWithHistory(),
			createTestRegistries(),
		);
		expect(handle.revertTo({ entry: newerEntry.source })).toBe(false);
		expect(dispatch).not.toHaveBeenCalled();
	});

	it("answers a mark of the present as reached without dispatching, even with undo left out", () => {
		const { dispatch, handle } = mountHandle(
			stateWithHistory(),
			createCanvasRegistries({ commands: [] }),
		);
		expect(handle.revertTo(handle.mark())).toBe(true);
		expect(dispatch).not.toHaveBeenCalled();
	});
});
