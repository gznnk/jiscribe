import { describe, expect, it } from "vitest";

import type {
	CanvasControllerState,
	CanvasModalKind,
} from "../../../CanvasTypes";
import { createTestRegistries } from "../../../registries/createCanvasRegistries";
import { ShortcutHelpCommand } from "../ShortcutHelpCommand";

const registries = createTestRegistries();

const makeState = (
	activeModal: CanvasModalKind | null,
): CanvasControllerState =>
	({ activeModal }) as unknown as CanvasControllerState;

describe("ShortcutHelpCommand", () => {
	it("opens the shortcut help modal", () => {
		const next = ShortcutHelpCommand.execute(makeState(null), registries);
		expect(next.activeModal).toBe("shortcutHelp");
	});

	it("returns the same state when the modal is already open", () => {
		const state = makeState("shortcutHelp");
		expect(ShortcutHelpCommand.execute(state, registries)).toBe(state);
	});

	it("replaces another open modal", () => {
		const next = ShortcutHelpCommand.execute(makeState("export"), registries);
		expect(next.activeModal).toBe("shortcutHelp");
	});

	// The binding is key-based ("?"), so the shift the character already implies
	// must not be checked separately (see CommandRegistry.findByShortcut).
	it("is matched from a Shift-produced `?` keydown", () => {
		const event = {
			key: "?",
			code: "Slash",
			ctrlKey: false,
			metaKey: false,
			shiftKey: true,
			altKey: false,
		} as KeyboardEvent;

		expect(registries.command.findByShortcut(event)?.id).toBe("shortcutHelp");
	});

	it("is not matched when a modifier is held", () => {
		const event = {
			key: "?",
			code: "Slash",
			ctrlKey: true,
			metaKey: false,
			shiftKey: true,
			altKey: false,
		} as KeyboardEvent;

		expect(registries.command.findByShortcut(event)).toBeUndefined();
	});
});
