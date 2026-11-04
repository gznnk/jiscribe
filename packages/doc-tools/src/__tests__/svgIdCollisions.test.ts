import type { CanvasDoc } from "@jiscribe/doc";
import { describe, expect, it } from "vitest";

import { diagnoseDoc } from "../diagnoseDoc";
import { validateDoc } from "../validateDoc";

/** Parses the objects as a document's root, failing on anything the parser reports. */
const docOf = (...objects: Record<string, unknown>[]): CanvasDoc => {
	const result = validateDoc(JSON.stringify({ version: 1, root: objects }));
	if (result.doc === undefined || result.diagnostics.length > 0) {
		throw new Error(
			result.diagnostics.map((diagnostic) => diagnostic.message).join("; "),
		);
	}
	return result.doc;
};

/** An svg object, set apart from the others so no other check has anything to say. */
const svg = (id: string, x: number, markup: string) => ({
	id,
	type: "svg",
	x,
	y: 0,
	width: 40,
	height: 40,
	svgText: `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 10 10">${markup}</svg>`,
});

const GRADIENT_DEF =
	'<defs><linearGradient id="shade"><stop offset="0"/></linearGradient></defs>';

describe("svg markup sharing an id with an svg drawn before it", () => {
	it("warns on the later svg when it refers to an id the earlier one also defines", () => {
		const diagnostics = diagnoseDoc(
			docOf(
				svg("first", 0, `${GRADIENT_DEF}<rect fill="url(#shade)"/>`),
				svg("second", 100, `${GRADIENT_DEF}<rect fill="url(#shade)"/>`),
			),
		);
		expect(diagnostics).toEqual([
			{
				severity: "warning",
				objectId: "second",
				message: expect.stringMatching(
					/^svg markup refers to ids an svg drawn before it also defines: "shade" \(defined first by first\); .* depends on which svgs are on screen, and it can resolve to the earlier svg's; rename the ids so each is unique within the document$/,
				),
			},
		]);
	});

	it.each([
		["href", '<symbol id="mark"/><use href="#mark"/>'],
		["xlink:href", "<symbol id='mark'/><use xlink:href='#mark'/>"],
		["a quoted url()", `<clipPath id="mark"/><g clip-path="url('#mark')"/>`],
	])("counts a reference through %s", (_label, markup) => {
		const diagnostics = diagnoseDoc(
			docOf(svg("first", 0, markup), svg("second", 100, markup)),
		);
		expect(diagnostics.map((diagnostic) => diagnostic.objectId)).toEqual([
			"second",
		]);
	});

	it("passes over a duplicate id nothing refers to", () => {
		expect(
			diagnoseDoc(
				docOf(
					svg("first", 0, '<g id="Layer_1"/>'),
					svg("second", 100, '<g id="Layer_1"/>'),
				),
			),
		).toEqual([]);
	});

	it("passes over a reference the later svg does not define itself", () => {
		expect(
			diagnoseDoc(
				docOf(
					svg("first", 0, GRADIENT_DEF),
					svg("second", 100, '<rect fill="url(#shade)"/>'),
				),
			),
		).toEqual([]);
	});

	it("passes over an id defined twice inside one svg", () => {
		expect(
			diagnoseDoc(
				docOf(
					svg(
						"only",
						0,
						`${GRADIENT_DEF}${GRADIENT_DEF}<rect fill="url(#shade)"/>`,
					),
				),
			),
		).toEqual([]);
	});

	it("does not read data-id or another attribute ending in id as an id", () => {
		expect(
			diagnoseDoc(
				docOf(
					svg("first", 0, '<g data-id="shade"/><g grid="shade"/>'),
					svg("second", 100, `${GRADIENT_DEF}<rect fill="url(#shade)"/>`),
				),
			),
		).toEqual([]);
	});

	it("reads a long run of unclosed url(# references in linear time", () => {
		// 100 KB that the pattern once rescanned to its end at every `url(`: seconds
		// of backtracking then, a few milliseconds now.
		const markup = "url(#".repeat(20_000);
		const doc = docOf(svg("first", 0, markup), svg("second", 100, markup));
		const startedAt = performance.now();
		expect(diagnoseDoc(doc)).toEqual([]);
		expect(performance.now() - startedAt).toBeLessThan(1_000);
	});

	it("names the svg drawn first among several defining the id, a group's children included", () => {
		const markup = `${GRADIENT_DEF}<rect fill="url(#shade)"/>`;
		const diagnostics = diagnoseDoc(
			docOf(
				{
					id: "group",
					type: "group",
					children: [svg("first", 0, markup), svg("second", 100, markup)],
				},
				svg("third", 200, markup),
			),
		);
		expect(
			diagnostics.map((diagnostic) => [
				diagnostic.objectId,
				/defined first by (\w+)/.exec(diagnostic.message)?.[1],
			]),
		).toEqual([
			["second", "first"],
			["third", "first"],
		]);
	});
});
