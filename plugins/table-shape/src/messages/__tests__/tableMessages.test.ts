import { describe, expect, it } from "vitest";

import { tablePlugin } from "../../plugin";
import { tableMessagesByLocale, TABLE_PLUGIN_ID } from "../tableMessages";

/**
 * The dictionary is keyed by command id and the canvas refuses a key naming a
 * command the plugin does not contribute, so the two lists have to agree — and a
 * command left out of `ja` would silently draw English rather than fail.
 */
describe("table messages", () => {
	const contributedIds = (tablePlugin.commands ?? []).map(
		(command) => command.id,
	);

	it("is wired into the plugin under the id its strings are namespaced by", () => {
		expect(tablePlugin.id).toBe(TABLE_PLUGIN_ID);
		expect(tablePlugin.messages).toBe(tableMessagesByLocale);
	});

	it("labels every contributed command in every locale it ships", () => {
		expect(contributedIds).toHaveLength(6);
		for (const [locale, messages] of Object.entries(tableMessagesByLocale)) {
			expect(
				Object.keys(messages.commandLabels ?? {}).sort(),
				`commandLabels of ${locale}`,
			).toEqual([...contributedIds].sort());
		}
	});

	it("gives a command its English label, which is what a third locale lands on", () => {
		const insertRowAbove = (tablePlugin.commands ?? []).find(
			(command) => command.id === "table.insertRowAbove",
		);
		expect(insertRowAbove?.label).toBe("Insert Row Above");
	});

	it("ships the same string keys in every locale", () => {
		const englishKeys = Object.keys(
			tableMessagesByLocale.en.strings ?? {},
		).sort();
		for (const [locale, messages] of Object.entries(tableMessagesByLocale)) {
			expect(
				Object.keys(messages.strings ?? {}).sort(),
				`strings of ${locale}`,
			).toEqual(englishKeys);
		}
	});
});
