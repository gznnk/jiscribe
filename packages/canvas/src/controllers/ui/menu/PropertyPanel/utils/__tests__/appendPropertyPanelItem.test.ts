import { describe, expect, it } from "vitest";

import type { PropertyPanelSection } from "../../PropertyPanelTypes";
import { appendPropertyPanelItem } from "../appendPropertyPanelItem";

/** Two sections, so a test can tell the one appended to from the one left alone. */
const sectionsOfLayoutAndText = (): PropertyPanelSection[] => [
	{ id: "layout", label: "Layout", items: [{ type: "position" }] },
	{ id: "text", label: "Text", items: [{ type: "fontSize" }] },
];

describe("appendPropertyPanelItem", () => {
	it("puts the row last in the section carrying the id", () => {
		const sections = appendPropertyPanelItem(
			sectionsOfLayoutAndText(),
			{ id: "layout", label: "Layout" },
			{ type: "autoHeight" },
		);

		expect(sections.map((section) => section.id)).toEqual(["layout", "text"]);
		expect(sections[0].items).toEqual([
			{ type: "position" },
			{ type: "autoHeight" },
		]);
	});

	it("leaves the other sections as they are", () => {
		const input = sectionsOfLayoutAndText();

		const sections = appendPropertyPanelItem(
			input,
			{ id: "layout", label: "Layout" },
			{ type: "autoHeight" },
		);

		expect(sections[1]).toBe(input[1]);
	});

	it("does not touch the sections it is given", () => {
		const input = sectionsOfLayoutAndText();

		appendPropertyPanelItem(
			input,
			{ id: "layout", label: "Layout" },
			{ type: "autoHeight" },
		);

		expect(input).toEqual(sectionsOfLayoutAndText());
	});

	it("creates the section at the end when none carries the id", () => {
		const sections = appendPropertyPanelItem(
			sectionsOfLayoutAndText(),
			{ id: "fill", label: "Fill" },
			{ type: "fill" },
		);

		expect(sections.map((section) => section.id)).toEqual([
			"layout",
			"text",
			"fill",
		]);
		expect(sections.at(-1)).toEqual({
			id: "fill",
			label: "Fill",
			items: [{ type: "fill" }],
		});
	});

	it("creates the section with the given label when it has to build one", () => {
		const sections = appendPropertyPanelItem(
			[],
			{ id: "text", label: "Text" },
			{ type: "textVerticalBasis" },
		);

		expect(sections).toEqual([
			{ id: "text", label: "Text", items: [{ type: "textVerticalBasis" }] },
		]);
	});
});
