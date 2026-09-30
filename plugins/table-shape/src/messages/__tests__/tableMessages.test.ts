import { describe, expect, it } from "vitest";

import { tablePlugin } from "../../plugin";
import { tableMessagesByLocale } from "../tableMessages";

/**
 * A command whose `label` is a plain string, or a dictionary missing the locale,
 * silently draws English rather than failing — so the locales each of the six
 * ships are what has to be pinned. The same goes for the plugin's own strings,
 * where a key left out of one locale reads as `undefined`.
 */
describe("table messages", () => {
	const contributedCommands = tablePlugin.commands ?? [];

	/** The locales the plugin's own dictionary ships, which the commands match. */
	const localeTags = Object.keys(tableMessagesByLocale);

	it("gives every contributed command a label in every locale", () => {
		expect(contributedCommands).toHaveLength(6);
		for (const command of contributedCommands) {
			expect(
				Object.keys(command.label).sort(),
				`label of ${command.id}`,
			).toEqual([...localeTags].sort());
		}
	});

	it("ships the same string keys in every locale", () => {
		const englishKeys = Object.keys(tableMessagesByLocale.en).sort();
		for (const [locale, strings] of Object.entries(tableMessagesByLocale)) {
			expect(Object.keys(strings).sort(), `strings of ${locale}`).toEqual(
				englishKeys,
			);
		}
	});
});
