import { describe, expect, it } from "vitest";

import { CommandRegistry } from "../CommandRegistry";
import type { Command } from "../CommandTypes";

/** A command answering to the bare ArrowUp on every platform. */
const buildArrowUpCommand = (id: string): Command => ({
	id,
	label: id,
	shortcuts: { default: [{ code: "ArrowUp" }] },
	canExecute: () => true,
	execute: (state) => state,
});

const arrowUpEvent = {
	code: "ArrowUp",
	key: "ArrowUp",
	ctrlKey: false,
	metaKey: false,
	shiftKey: false,
	altKey: false,
} as KeyboardEvent;

const matchedIds = (registry: CommandRegistry): string[] =>
	registry.findAllByShortcut(arrowUpEvent).map((command) => command.id);

describe("CommandRegistry", () => {
	it("returns built-in matches in registration order", () => {
		const registry = new CommandRegistry().registerAll([
			buildArrowUpCommand("built-in-a"),
			buildArrowUpCommand("built-in-b"),
		]);
		expect(matchedIds(registry)).toEqual(["built-in-a", "built-in-b"]);
	});

	it("puts contributed matches ahead of built-in ones, each in registration order", () => {
		const registry = new CommandRegistry()
			.registerAll([
				buildArrowUpCommand("built-in-a"),
				buildArrowUpCommand("built-in-b"),
			])
			.registerAll(
				[
					buildArrowUpCommand("contributed-a"),
					buildArrowUpCommand("contributed-b"),
				],
				"contributed",
			);
		expect(matchedIds(registry)).toEqual([
			"contributed-a",
			"contributed-b",
			"built-in-a",
			"built-in-b",
		]);
	});

	it("keeps getAll in registration order", () => {
		const registry = new CommandRegistry()
			.register(buildArrowUpCommand("built-in"))
			.register(buildArrowUpCommand("contributed"), "contributed");
		expect(registry.getAll().map((command) => command.id)).toEqual([
			"built-in",
			"contributed",
		]);
	});

	it("forgets the contributed origin on clear", () => {
		const registry = new CommandRegistry()
			.register(buildArrowUpCommand("shared-id"), "contributed")
			.register(buildArrowUpCommand("built-in"));
		registry.clear();
		registry
			.register(buildArrowUpCommand("built-in"))
			.register(buildArrowUpCommand("shared-id"));
		expect(matchedIds(registry)).toEqual(["built-in", "shared-id"]);
	});
});
