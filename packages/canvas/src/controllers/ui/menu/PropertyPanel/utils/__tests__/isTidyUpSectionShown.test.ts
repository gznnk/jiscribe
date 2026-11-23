import { describe, expect, it } from "vitest";

import { createCanvasRegistries } from "../../../../../registries/createCanvasRegistries";
import { isTidyUpSectionShown } from "../isTidyUpSectionShown";

const commandRegistryOf = (commandIds?: string[]) =>
	createCanvasRegistries({ commands: commandIds }).command;

describe("isTidyUpSectionShown", () => {
	it("shows the section on a canvas with every command registered", () => {
		expect(isTidyUpSectionShown(commandRegistryOf())).toBe(true);
	});

	it("hides it when none of the three commands is registered", () => {
		expect(isTidyUpSectionShown(commandRegistryOf(["undo", "redo"]))).toBe(
			false,
		);
	});

	it.each(["layoutTopToBottom", "layoutLeftToRight", "routeConnectors"])(
		"shows it when %s alone is registered",
		(commandId) => {
			expect(isTidyUpSectionShown(commandRegistryOf(["undo", commandId]))).toBe(
				true,
			);
		},
	);
});
