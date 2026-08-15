import { describe, expect, it } from "vitest";

import type {
	CanvasControllerState,
	CanvasModalKind,
} from "../../../CanvasTypes";
import { createTestRegistries } from "../../../registries/createCanvasRegistries";
import { ExportCommand } from "../ExportCommand";

const registries = createTestRegistries();

const makeState = (
	activeModal: CanvasModalKind | null,
): CanvasControllerState =>
	({ activeModal }) as unknown as CanvasControllerState;

describe("ExportCommand", () => {
	it("opens the export dialog", () => {
		const next = ExportCommand.execute(makeState(null), registries);
		expect(next.activeModal).toBe("export");
	});

	it("returns the same state when the dialog is already open", () => {
		const state = makeState("export");
		expect(ExportCommand.execute(state, registries)).toBe(state);
	});

	it("replaces another open modal", () => {
		const next = ExportCommand.execute(makeState("shortcutHelp"), registries);
		expect(next.activeModal).toBe("export");
	});
});
