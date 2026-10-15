// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createCommandState } from "../../commands/__tests__/support/createCommandState";
import { twoRectsWithConnectorDoc } from "../../commands/__tests__/support/fixtures";
import type { Command } from "../../commands/CommandTypes";
import type { CanvasRegistries } from "../../registries/CanvasRegistries";
import { createTestRegistries } from "../../registries/createCanvasRegistries";
import { useKeyboardShortcuts } from "../useKeyboardShortcuts";

/**
 * Which command a keystroke reaches when several share its binding: the matches
 * are walked in registry order (contributed ahead of built-ins), and the first
 * that has a callback or can execute takes the key.
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

const mountShortcuts = (
	registries: CanvasRegistries,
	callbacks: Partial<Record<string, () => void>>,
) => {
	const containerElement = document.createElement("div");
	document.body.appendChild(containerElement);
	const dispatch = vi.fn();

	const Probe = () => {
		useKeyboardShortcuts({
			containerRef: { current: containerElement },
			canvasState: createCommandState(twoRectsWithConnectorDoc),
			dispatch,
			callbacks,
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
		/** Fires Ctrl+<code> on the container and reports whether it was claimed. */
		pressCtrl: (code: string) => {
			const event = new KeyboardEvent("keydown", {
				code,
				ctrlKey: true,
				bubbles: true,
				cancelable: true,
			});
			containerElement.dispatchEvent(event);
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
});
