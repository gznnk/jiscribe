// @vitest-environment jsdom

import type { CanvasDoc } from "@jiscribe/doc/model/canvas/CanvasDoc";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { readRichTextSlot } from "../../../states/objects/types/TextSlots";
import type { TextSlots } from "../../../states/objects/types/TextSlots";
import type { CanvasControllerState } from "../../CanvasTypes";
import { twoRectsWithConnectorDoc } from "../../commands/__tests__/support/fixtures";
import { createTestState } from "../../reducer/__tests__/support/createTestState";
import type { CanvasAction } from "../../reducer/CanvasActions";
import type { CanvasRegistries } from "../../registries/CanvasRegistries";
import {
	createCanvasRegistries,
	createTestRegistries,
} from "../../registries/createCanvasRegistries";
import { selectionOf } from "../../selection/__tests__/support/selectionOf";
import { textSlotPartSelection } from "../../selection/__tests__/support/textSlotPartSelection";
import { useTextEditSession } from "../useTextEditSession";

/**
 * What the session derives from the open editor (which object and slot it
 * covers, the draft-grafted objects the menus read) and how the editor's
 * keystrokes reach the canvas: gated on the matching command being registered,
 * through handlers that keep their identity across canvas dispatches.
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

const rectWithBodyDoc: CanvasDoc = {
	version: 1,
	root: [
		{
			id: "rect-1",
			type: "rect",
			x: 0,
			y: 0,
			width: 100,
			height: 40,
			text: "ab",
		},
	],
} as unknown as CanvasDoc;

const committedBodyOf = (state: CanvasControllerState) =>
	readRichTextSlot(
		(state.objects["rect-1"] as unknown as { text: TextSlots }).text,
		"body",
	);

/** The rect mid-edit on its body slot, the draft set to `draftText`. */
const editingState = (draftText?: string): CanvasControllerState => {
	const base = createTestState(rectWithBodyDoc);
	return createTestState(rectWithBodyDoc, {
		selection: selectionOf(["rect-1"], textSlotPartSelection("body")),
		textEditState: {
			kind: "shape",
			text: draftText ?? committedBodyOf(base),
		},
	});
};

type SessionResult = ReturnType<typeof useTextEditSession>;

/** Mounts the hook and returns a way to re-render it with another state, reading back what it returned. */
const mountSession = (
	initialState: CanvasControllerState,
	registries: CanvasRegistries = createTestRegistries(),
) => {
	const dispatch = vi.fn<(action: CanvasAction) => void>();
	let returned: SessionResult | null = null;
	const Probe = ({ canvasState }: { canvasState: CanvasControllerState }) => {
		returned = useTextEditSession({ canvasState, dispatch, registries });
		return null;
	};
	const root = createRoot(document.createElement("div"));
	roots.push(root);
	const render = (canvasState: CanvasControllerState): SessionResult => {
		act(() => {
			root.render(<Probe canvasState={canvasState} />);
		});
		if (returned === null) {
			throw new Error("the probe did not render");
		}
		return returned;
	};
	return { dispatch, first: render(initialState), render };
};

describe("useTextEditSession derived state", () => {
	it("reports no session and passes the committed state through while nothing is edited", () => {
		const canvasState = createTestState(rectWithBodyDoc);
		const { first } = mountSession(canvasState);
		expect(first.textEditObjectId).toBeNull();
		expect(first.editingTextSlotId).toBeNull();
		expect(first.draftObjects).toBe(canvasState.objects);
		expect(first.menuCanvasState).toBe(canvasState);
	});

	it("names the edited shape and slot, and keeps the committed state while the draft is untouched", () => {
		const canvasState = editingState();
		const { first } = mountSession(canvasState);
		expect(first.textEditObjectId).toBe("rect-1");
		expect(first.editingTextSlotId).toBe("body");
		expect(first.draftObjects).toBe(canvasState.objects);
		expect(first.menuCanvasState).toBe(canvasState);
	});

	it("grafts a typed draft onto the edited slot for the menus, leaving the committed objects alone", () => {
		const canvasState = editingState("abc");
		const { first } = mountSession(canvasState);
		expect(first.draftObjects).not.toBe(canvasState.objects);
		expect(
			readRichTextSlot(
				(first.draftObjects["rect-1"] as unknown as { text: TextSlots }).text,
				"body",
			),
		).toBe("abc");
		expect(committedBodyOf(canvasState)).toBe("ab");
		expect(first.menuCanvasState.objects).toBe(first.draftObjects);
		expect(first.menuCanvasState.viewport).toBe(canvasState.viewport);
	});

	it("names the connector for a label edit but no slot", () => {
		const canvasState = createTestState(twoRectsWithConnectorDoc, {
			selection: selectionOf(["conn-1"]),
			textEditState: { kind: "connectorLabel", text: "label" },
		});
		const { first } = mountSession(canvasState);
		expect(first.textEditObjectId).toBe("conn-1");
		expect(first.editingTextSlotId).toBeNull();
		expect(first.draftObjects).toBe(canvasState.objects);
	});
});

describe("useTextEditSession editor handlers", () => {
	it("keeps the handlers object and every handler stable across canvas re-renders", () => {
		const { first, render } = mountSession(editingState());
		const next = render(editingState("abc"));
		expect(next.editorHandlers).toBe(first.editorHandlers);
	});

	it("feeds text, selection and escape straight into the reducer", () => {
		const { dispatch, first } = mountSession(editingState());
		first.editorHandlers.onTextChange("x");
		first.editorHandlers.onSelectionChange({ start: 0, end: 1 });
		first.editorHandlers.onEscape();
		expect(dispatch.mock.calls.map(([action]) => action)).toEqual([
			{ type: "UPDATE_TEXT_EDIT", text: "x" },
			{
				type: "UPDATE_TEXT_EDIT_SELECTION",
				selection: { start: 0, end: 1 },
			},
			{ type: "END_TEXT_EDIT", commit: false },
		]);
	});

	it("runs commit and format toggles as commands, and steps Tab in either direction", () => {
		const { dispatch, first } = mountSession(editingState());
		first.editorHandlers.onCommit();
		first.editorHandlers.onToggleFormat("bold");
		first.editorHandlers.onTab(1);
		first.editorHandlers.onTab(-1);
		expect(dispatch.mock.calls.map(([action]) => action)).toEqual([
			{ type: "COMMAND", commandId: "commitTextEdit" },
			{ type: "COMMAND", commandId: "toggleBold" },
			{ type: "STEP_TEXT_EDIT", step: 1 },
			{ type: "STEP_TEXT_EDIT", step: -1 },
		]);
	});

	it("swallows commit, format and Tab when the host left their commands out", () => {
		const registries = createCanvasRegistries({ commands: [] });
		const { dispatch, first } = mountSession(editingState(), registries);
		first.editorHandlers.onCommit();
		first.editorHandlers.onToggleFormat("italic");
		first.editorHandlers.onTab(1);
		first.editorHandlers.onTab(-1);
		expect(dispatch).not.toHaveBeenCalled();
	});

	it("gates each Tab direction on its own command", () => {
		const registries = createCanvasRegistries({
			commands: ["selectPreviousTextSlot"],
		});
		const { dispatch, first } = mountSession(editingState(), registries);
		first.editorHandlers.onTab(1);
		first.editorHandlers.onTab(-1);
		expect(dispatch.mock.calls.map(([action]) => action)).toEqual([
			{ type: "STEP_TEXT_EDIT", step: -1 },
		]);
	});
});
