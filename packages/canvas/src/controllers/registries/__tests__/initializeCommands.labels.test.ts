import { describe, expect, it } from "vitest";

import { defaultCanvasMessages } from "../../../foundation/i18n/CanvasMessages";
import { resolveCommandLabel } from "../../commands/CommandUtils";
import { ToggleStencilLibraryCommand } from "../../commands/view/ToggleStencilLibraryCommand";
import { ALL_COMMANDS } from "../initializeCommands";

/**
 * `LocaleMessages` requires only `en`, and a `label` may be a plain string, so a
 * built-in command left without its `ja` draws English on a Japanese canvas
 * without failing anywhere. The coverage of the locales the canvas itself ships
 * therefore has to be asserted rather than typed.
 */
describe("built-in command labels", () => {
	it("names every command in every locale the canvas ships", () => {
		for (const command of ALL_COMMANDS) {
			expect(
				Object.keys(command.label).sort(),
				`label of ${command.id}`,
			).toEqual(["en", "ja"]);
		}
	});

	it("reads the catalog toggle in Japanese", () => {
		expect(
			resolveCommandLabel(
				ToggleStencilLibraryCommand,
				defaultCanvasMessages,
				"ja",
			),
		).toBe("図形を探す");
	});
});
