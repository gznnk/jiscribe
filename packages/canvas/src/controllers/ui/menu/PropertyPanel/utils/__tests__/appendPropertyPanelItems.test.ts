import { describe, expect, it } from "vitest";

import type { PropertyPanelSection } from "../../PropertyPanelTypes";
import {
	appendPropertyPanelItems,
	ensurePropertyPanelItems,
} from "../appendPropertyPanelItems";

/** Two sections, so a test can tell the one appended to from the one left alone. */
const sectionsOfLayoutAndText = (): PropertyPanelSection[] => [
	{ id: "layout", label: "Layout", items: [{ type: "position" }] },
	{ id: "text", label: "Text", items: [{ type: "fontSize" }] },
];

describe("appendPropertyPanelItems", () => {
	it("puts the row last in the section carrying the id", () => {
		const sections = appendPropertyPanelItems(
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

		const sections = appendPropertyPanelItems(
			input,
			{ id: "layout", label: "Layout" },
			{ type: "autoHeight" },
		);

		expect(sections[1]).toBe(input[1]);
	});

	it("does not touch the sections it is given", () => {
		const input = sectionsOfLayoutAndText();

		appendPropertyPanelItems(
			input,
			{ id: "layout", label: "Layout" },
			{ type: "autoHeight" },
		);

		expect(input).toEqual(sectionsOfLayoutAndText());
	});

	it("puts several rows last in the order they are given", () => {
		const sections = appendPropertyPanelItems(
			sectionsOfLayoutAndText(),
			{ id: "layout", label: "Layout" },
			{ type: "size" },
			{ type: "autoHeight" },
		);

		expect(sections[0].items).toEqual([
			{ type: "position" },
			{ type: "size" },
			{ type: "autoHeight" },
		]);
	});

	it("creates the section at the end when none carries the id", () => {
		const sections = appendPropertyPanelItems(
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

	it("creates the section holding every row it was given", () => {
		const sections = appendPropertyPanelItems(
			[],
			{ id: "line", label: "Line" },
			{ type: "strokeColor" },
			{ type: "strokeWidth" },
		);

		expect(sections).toEqual([
			{
				id: "line",
				label: "Line",
				items: [{ type: "strokeColor" }, { type: "strokeWidth" }],
			},
		]);
	});

	it("creates the section with the given label when it has to build one", () => {
		const sections = appendPropertyPanelItems(
			[],
			{ id: "text", label: "Text" },
			{ type: "textVerticalBasis" },
		);

		expect(sections).toEqual([
			{ id: "text", label: "Text", items: [{ type: "textVerticalBasis" }] },
		]);
	});
});

describe("ensurePropertyPanelItems", () => {
	it("appends a row the section does not carry yet", () => {
		const sections = ensurePropertyPanelItems(
			sectionsOfLayoutAndText(),
			{ id: "layout", label: "Layout" },
			{ type: "lockAspectRatio" },
		);

		expect(sections[0].items).toEqual([
			{ type: "position" },
			{ type: "lockAspectRatio" },
		]);
	});

	it("leaves a row the section already carries where it is", () => {
		const sections = ensurePropertyPanelItems(
			[
				{
					id: "layout",
					label: "Layout",
					items: [{ type: "lockAspectRatio" }, { type: "position" }],
				},
			],
			{ id: "layout", label: "Layout" },
			{ type: "lockAspectRatio" },
		);

		expect(sections[0].items).toEqual([
			{ type: "lockAspectRatio" },
			{ type: "position" },
		]);
	});

	it("appends only the rows that are missing", () => {
		const sections = ensurePropertyPanelItems(
			sectionsOfLayoutAndText(),
			{ id: "layout", label: "Layout" },
			{ type: "position" },
			{ type: "size" },
		);

		expect(sections[0].items).toEqual([{ type: "position" }, { type: "size" }]);
	});

	it("matches a custom row by its id", () => {
		const Row = (): null => null;
		const sections = ensurePropertyPanelItems(
			[
				{
					id: "layout",
					label: "Layout",
					items: [{ type: "custom", id: "span", component: Row }],
				},
			],
			{ id: "layout", label: "Layout" },
			{ type: "custom", id: "span", component: Row },
		);

		expect(sections[0].items).toHaveLength(1);
	});

	it("creates the section at the end when none carries the id", () => {
		const sections = ensurePropertyPanelItems(
			sectionsOfLayoutAndText(),
			{ id: "fill", label: "Fill" },
			{ type: "fill" },
		);

		expect(sections.at(-1)).toEqual({
			id: "fill",
			label: "Fill",
			items: [{ type: "fill" }],
		});
	});

	it("does not touch the sections it is given", () => {
		const input = sectionsOfLayoutAndText();

		ensurePropertyPanelItems(
			input,
			{ id: "layout", label: "Layout" },
			{ type: "lockAspectRatio" },
		);

		expect(input).toEqual(sectionsOfLayoutAndText());
	});
});
