import { describe, it, expect } from "vitest";

import type { CoreStyleIntentKind } from "../../StyleIntent";
import { TEXT_STYLE_INTENT_KINDS } from "../../StyleIntent";
import { textStyleTable } from "../textStyleTable";

/** The kinds a text type answers for, sorted — the table's declaration order is its own business. */
const kindsOf = (
	textType: Parameters<typeof textStyleTable>[0],
): CoreStyleIntentKind[] =>
	(Object.keys(textStyleTable(textType)) as CoreStyleIntentKind[])
		.slice()
		.sort();

describe("textStyleTable", () => {
	it("a body takes the whole typography, the keystroke toggles included", () => {
		expect(kindsOf("body")).toEqual([
			"fontColor",
			"fontFamily",
			"fontSize",
			"fontStyle",
			"fontWeight",
			"textAlign",
			"textContent",
			"textDecoration",
			"toggleBold",
			"toggleItalic",
			"toggleStrikethrough",
			"toggleUnderline",
			"verticalAlign",
		]);
	});

	it("named slots take the same set as a body", () => {
		expect(kindsOf("slots")).toEqual(kindsOf("body"));
	});

	it("a source-language body takes the base fields and the alignments alone", () => {
		// Its own syntax carries the emphasis, so neither those fields nor the
		// toggles that flip them are answered for (textStyleKeysOf). The content is
		// answered for by every type holding text.
		expect(kindsOf("source")).toEqual([
			"fontColor",
			"fontFamily",
			"fontSize",
			"textAlign",
			"textContent",
			"verticalAlign",
		]);
	});

	it("holds no kind TEXT_STYLE_INTENT_KINDS leaves out, and a body holds them all", () => {
		expect(kindsOf("body")).toEqual([...TEXT_STYLE_INTENT_KINDS].sort());
		for (const kind of kindsOf("source")) {
			expect(TEXT_STYLE_INTENT_KINDS.has(kind)).toBe(true);
		}
	});
});
