import { afterEach, describe, expect, it, vi } from "vitest";

import { createCommandState } from "./support/createCommandState";
import { twoRectsWithConnectorDoc } from "./support/fixtures";
import { createTestRegistries } from "../../registries/createCanvasRegistries";
import { handleCommand } from "../handlers/handleCommand";

/** Pin getPlatform()'s detection via navigator.userAgent */
const stubPlatform = (platform: "mac" | "win"): void => {
	const userAgent =
		platform === "mac"
			? "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"
			: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)";
	vi.stubGlobal("navigator", { userAgent });
};

afterEach(() => {
	vi.unstubAllGlobals();
});

const keyEvent = (init: {
	code: string;
	ctrlKey?: boolean;
	metaKey?: boolean;
	shiftKey?: boolean;
	altKey?: boolean;
}): KeyboardEvent =>
	({
		key: "",
		ctrlKey: false,
		metaKey: false,
		shiftKey: false,
		altKey: false,
		...init,
	}) as KeyboardEvent;

/**
 * Paste is a definition-only command: the shortcut lives in the registry
 * (matching / help modal), while execution goes through the useClipboardPaste
 * callback. These tests pin the registry side of that contract, which replaced
 * the hand-written Ctrl+V matcher formerly in useClipboardPaste (issue #113).
 */
describe("paste shortcut registration", () => {
	it("matches Ctrl+V on Windows via findByShortcut", () => {
		stubPlatform("win");
		const registries = createTestRegistries();
		const command = registries.command.findByShortcut(
			keyEvent({ code: "KeyV", ctrlKey: true }),
		);
		expect(command?.id).toBe("paste");
	});

	it("matches Cmd+V on Mac via findByShortcut", () => {
		stubPlatform("mac");
		const registries = createTestRegistries();
		const command = registries.command.findByShortcut(
			keyEvent({ code: "KeyV", metaKey: true }),
		);
		expect(command?.id).toBe("paste");
	});

	it("does not match Ctrl+Shift+V", () => {
		stubPlatform("win");
		const registries = createTestRegistries();
		const command = registries.command.findByShortcut(
			keyEvent({ code: "KeyV", ctrlKey: true, shiftKey: true }),
		);
		expect(command).toBeUndefined();
	});

	it("is a no-op when dispatched as a COMMAND action (execute-less guard)", () => {
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
		const registries = createTestRegistries();
		const state = createCommandState(twoRectsWithConnectorDoc);
		const result = handleCommand(state, "paste", registries);
		expect(result).toBe(state);
		expect(warnSpy).toHaveBeenCalled();
		warnSpy.mockRestore();
	});
});
