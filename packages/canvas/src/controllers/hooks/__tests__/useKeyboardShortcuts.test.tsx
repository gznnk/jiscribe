// @vitest-environment jsdom

import { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { CanvasControllerState } from "../../CanvasTypes";
import { createCommandState } from "../../commands/__tests__/support/createCommandState";
import { twoRectsWithConnectorDoc } from "../../commands/__tests__/support/fixtures";
import type { Command } from "../../commands/CommandTypes";
import type { CanvasRegistries } from "../../registries/CanvasRegistries";
import { createTestRegistries } from "../../registries/createCanvasRegistries";
import { useKeyboardShortcuts } from "../useKeyboardShortcuts";

/**
 * Which command a keystroke reaches when several share its binding: the matches
 * are walked in registry order (contributed ahead of built-ins), and the first
 * that has a callback or can execute takes the key. Also that the recognizer's
 * pending gestures are dispatched and committed before the key is decided.
 */

// Without this React treats every `act` below as unsupported and warns.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const roots: { unmount: () => void }[] = [];

/** A contributed command bound to Ctrl+V, the binding the built-in paste holds. */
const contributedPasteCommand = (canExecute: boolean): Command => ({
	id: "plugin.pasteIntoCell",
	label: "Paste into cell",
	shortcuts: { default: [{ code: "KeyV", ctrl: true }] },
	canExecute: () => canExecute,
	execute: (state) => state,
});

/** A contributed command bound to Ctrl+K that runs only while something is selected. */
const selectionOnlyCommand: Command = {
	id: "plugin.selectionOnly",
	label: "Selection only",
	shortcuts: { default: [{ code: "KeyK", ctrl: true }] },
	canExecute: (state) => state.selection.objectIds.length > 0,
	execute: (state) => state,
};

const initialCanvasState = createCommandState(twoRectsWithConnectorDoc);

const mountShortcuts = (
	registries: CanvasRegistries,
	callbacks: Partial<Record<string, () => void>>,
	/**
	 * Stands in for the recognizer's drain; receives the Probe's state setter so it
	 * can play the gesture actions it would dispatch.
	 */
	onProcessPendingGestures: (
		setCanvasState: (canvasState: CanvasControllerState) => void,
	) => void = () => {},
) => {
	const containerElement = document.createElement("div");
	document.body.appendChild(containerElement);
	const dispatch = vi.fn();
	const processPendingGestures = vi.fn();

	const Probe = () => {
		const [canvasState, setCanvasState] = useState(initialCanvasState);
		useKeyboardShortcuts({
			containerRef: { current: containerElement },
			canvasState,
			dispatch,
			callbacks,
			processPendingGestures: () => {
				processPendingGestures();
				onProcessPendingGestures(setCanvasState);
			},
			registries,
		});
		return null;
	};

	const root = createRoot(document.createElement("div"));
	roots.push(root);
	act(() => {
		root.render(<Probe />);
	});

	return {
		dispatch,
		processPendingGestures,
		/**
		 * Fires Ctrl+<code> and reports whether it was claimed. `targetElement` is
		 * appended inside the container and fires the key, as a focused field would;
		 * omitted, the container fires it.
		 */
		pressCtrl: (code: string, targetElement?: HTMLElement) => {
			const event = new KeyboardEvent("keydown", {
				code,
				ctrlKey: true,
				bubbles: true,
				cancelable: true,
			});
			if (targetElement) {
				containerElement.appendChild(targetElement);
			}
			(targetElement ?? containerElement).dispatchEvent(event);
			return event.defaultPrevented;
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

describe("useKeyboardShortcuts", () => {
	it("gives a shared key to a contributed command that can execute ahead of the paste callback", () => {
		const registries = createTestRegistries();
		registries.command.register(contributedPasteCommand(true), "contributed");
		const paste = vi.fn();
		const { dispatch, pressCtrl } = mountShortcuts(registries, { paste });

		expect(pressCtrl("KeyV")).toBe(true);
		expect(dispatch).toHaveBeenCalledWith({
			type: "COMMAND",
			commandId: "plugin.pasteIntoCell",
		});
		expect(paste).not.toHaveBeenCalled();
	});

	it("falls through to the paste callback while the contributed command cannot execute", () => {
		const registries = createTestRegistries();
		registries.command.register(contributedPasteCommand(false), "contributed");
		const paste = vi.fn();
		const { dispatch, pressCtrl } = mountShortcuts(registries, { paste });

		expect(pressCtrl("KeyV")).toBe(true);
		expect(paste).toHaveBeenCalledTimes(1);
		expect(dispatch).not.toHaveBeenCalled();
	});

	it("runs the paste callback when only the built-in claims the key", () => {
		const paste = vi.fn();
		const { dispatch, pressCtrl } = mountShortcuts(createTestRegistries(), {
			paste,
		});

		expect(pressCtrl("KeyV")).toBe(true);
		expect(paste).toHaveBeenCalledTimes(1);
		expect(dispatch).not.toHaveBeenCalled();
	});

	it("runs an undo callback without consulting canExecute", () => {
		// The fixture state has no history, so the built-in undo cannot execute.
		const undo = vi.fn();
		const { dispatch, pressCtrl } = mountShortcuts(createTestRegistries(), {
			undo,
		});

		expect(pressCtrl("KeyZ")).toBe(true);
		expect(undo).toHaveBeenCalledTimes(1);
		expect(dispatch).not.toHaveBeenCalled();
	});

	it("leaves the key to the browser when no matching command can execute", () => {
		const { dispatch, pressCtrl } = mountShortcuts(createTestRegistries(), {});

		expect(pressCtrl("KeyZ")).toBe(false);
		expect(dispatch).not.toHaveBeenCalled();
	});

	it("dispatches a built-in command that can execute", () => {
		const { dispatch, pressCtrl } = mountShortcuts(createTestRegistries(), {});

		expect(pressCtrl("KeyA")).toBe(true);
		expect(dispatch).toHaveBeenCalledWith({
			type: "COMMAND",
			commandId: "selectAll",
		});
	});

	it("decides the key against the state the pending gestures leave behind", () => {
		const registries = createTestRegistries();
		registries.command.register(selectionOnlyCommand, "contributed");
		const { dispatch, processPendingGestures, pressCtrl } = mountShortcuts(
			registries,
			{},
			(setCanvasState) => {
				// Plays a marquee's dragEnd selecting a shape, as the drain would dispatch it.
				setCanvasState({
					...initialCanvasState,
					selection: {
						...initialCanvasState.selection,
						objectIds: ["rect-1"],
					},
				});
			},
		);

		expect(pressCtrl("KeyK")).toBe(true);
		expect(processPendingGestures).toHaveBeenCalledTimes(1);
		expect(processPendingGestures.mock.invocationCallOrder[0]).toBeLessThan(
			dispatch.mock.invocationCallOrder[0],
		);
		expect(dispatch).toHaveBeenCalledWith({
			type: "COMMAND",
			commandId: "plugin.selectionOnly",
		});
	});

	it("drains the pending gestures ahead of a callback-executed command", () => {
		const paste = vi.fn();
		const { processPendingGestures, pressCtrl } = mountShortcuts(
			createTestRegistries(),
			{ paste },
		);

		expect(pressCtrl("KeyV")).toBe(true);
		expect(processPendingGestures.mock.invocationCallOrder[0]).toBeLessThan(
			paste.mock.invocationCallOrder[0],
		);
	});

	it.each([
		["an input", () => document.createElement("input")],
		["a textarea", () => document.createElement("textarea")],
		["a select", () => document.createElement("select")],
		[
			"a contenteditable element",
			() => {
				const editableElement = document.createElement("div");
				editableElement.contentEditable = "true";
				// jsdom does not implement isContentEditable, which the hook reads.
				Object.defineProperty(editableElement, "isContentEditable", {
					value: true,
				});
				return editableElement;
			},
		],
	])("leaves a key fired from %s to that field", (_, createField) => {
		const undo = vi.fn();
		const { dispatch, processPendingGestures, pressCtrl } = mountShortcuts(
			createTestRegistries(),
			{ undo },
		);

		expect(pressCtrl("KeyA", createField())).toBe(false);
		expect(pressCtrl("KeyZ", createField())).toBe(false);
		expect(dispatch).not.toHaveBeenCalled();
		expect(undo).not.toHaveBeenCalled();
		expect(processPendingGestures).not.toHaveBeenCalled();
	});

	it("still takes a key fired from an element that is not a field", () => {
		const { dispatch, pressCtrl } = mountShortcuts(createTestRegistries(), {});

		expect(pressCtrl("KeyA", document.createElement("button"))).toBe(true);
		expect(dispatch).toHaveBeenCalledWith({
			type: "COMMAND",
			commandId: "selectAll",
		});
	});

	it("leaves the pending gestures to their frame for a key no command claims", () => {
		const { processPendingGestures, pressCtrl } = mountShortcuts(
			createTestRegistries(),
			{},
		);

		expect(pressCtrl("KeyQ")).toBe(false);
		expect(processPendingGestures).not.toHaveBeenCalled();
	});
});
