import type { CanvasDoc } from "@jiscribe/doc";
import { describe, expect, it } from "vitest";

import { diagnoseDoc } from "../diagnoseDoc";
import { validateDoc } from "../validateDoc";

/**
 * A sentence whose full stop is the only thing that does not fit: at 16px in a
 * 320px-wide box (308px of content) it takes the whole first line up to 「です」
 * and leaves 「。」 alone on the second. The same sentence in a 200px box breaks
 * mid-word instead, which is the pairing the tests below are built on.
 */
const STOP_AT_THE_EDGE_TEXT = "行頭に句点が落ちるかを確かめる文章です。";

/** Width whose content box leaves the full stop stranded on line 2. */
const ORPHANING_WIDTH = 320;

/** Width the same text breaks somewhere typesetting allows at. */
const CLEAN_BREAK_WIDTH = 200;

/** A one-object document, as it would be read off disk. */
const docOf = (object: Record<string, unknown>): CanvasDoc => {
	const result = validateDoc(JSON.stringify({ version: 1, root: [object] }));
	if (result.doc === undefined) {
		throw new Error(
			result.diagnostics.map((diagnostic) => diagnostic.message).join("; "),
		);
	}
	return result.doc;
};

describe("line-start prohibition", () => {
	it("warns about a block text that wraps a full stop onto a line head", () => {
		const diagnostics = diagnoseDoc(
			docOf({
				id: "body",
				type: "text",
				textLayout: "block",
				x: 0,
				y: 0,
				width: ORPHANING_WIDTH,
				text: STOP_AT_THE_EDGE_TEXT,
				fontSize: 16,
			}),
		);
		expect(diagnostics).toHaveLength(1);
		expect(diagnostics[0]).toMatchObject({
			severity: "warning",
			objectId: "body",
		});
		// The line and the character behind the verdict, so a caller reading one
		// line knows which break to rewrite around.
		expect(diagnostics[0].message).toMatch(/line 2 starts with "。"/);
	});

	it("leaves the document valid, the finding being one of appearance", () => {
		const diagnostics = diagnoseDoc(
			docOf({
				id: "body",
				type: "text",
				textLayout: "block",
				x: 0,
				y: 0,
				width: ORPHANING_WIDTH,
				text: STOP_AT_THE_EDGE_TEXT,
				fontSize: 16,
			}),
		);
		expect(
			diagnostics.every((diagnostic) => diagnostic.severity === "warning"),
		).toBe(true);
	});

	it("reports nothing for the same text on a single line", () => {
		expect(
			diagnoseDoc(
				docOf({
					id: "body",
					type: "text",
					textLayout: "block",
					x: 0,
					y: 0,
					width: 400,
					text: STOP_AT_THE_EDGE_TEXT,
					fontSize: 16,
				}),
			),
		).toEqual([]);
	});

	it("reports nothing when the break falls on an ordinary character", () => {
		expect(
			diagnoseDoc(
				docOf({
					id: "body",
					type: "text",
					textLayout: "block",
					x: 0,
					y: 0,
					width: CLEAN_BREAK_WIDTH,
					text: STOP_AT_THE_EDGE_TEXT,
					fontSize: 16,
				}),
			),
		).toEqual([]);
	});

	it("warns about a shape drawn at the height its own text comes to", () => {
		const diagnostics = diagnoseDoc(
			docOf({
				id: "box",
				type: "rect",
				x: 0,
				y: 0,
				width: ORPHANING_WIDTH,
				text: STOP_AT_THE_EDGE_TEXT,
				fontSize: 16,
			}),
		);
		expect(diagnostics).toHaveLength(1);
		expect(diagnostics[0]).toMatchObject({
			severity: "warning",
			objectId: "box",
		});
		expect(diagnostics[0].message).toMatch(/text in rect breaks a line/);
	});

	it("warns once about a text that breaks badly more than once", () => {
		const diagnostics = diagnoseDoc(
			docOf({
				id: "body",
				type: "text",
				textLayout: "block",
				x: 0,
				y: 0,
				width: ORPHANING_WIDTH,
				text: `${STOP_AT_THE_EDGE_TEXT}\n${STOP_AT_THE_EDGE_TEXT}`,
				fontSize: 16,
			}),
		);
		expect(diagnostics).toHaveLength(1);
		expect(diagnostics[0].message).toMatch(
			/line 2 starts with "。", line 4 starts with "。"/,
		);
	});

	it("reports nothing for a shape whose text ends where the line does", () => {
		expect(
			diagnoseDoc(
				docOf({
					id: "box",
					type: "rect",
					x: 0,
					y: 0,
					width: 200,
					height: 60,
					text: "短い文。",
					fontSize: 16,
				}),
			),
		).toEqual([]);
	});

	it("warns about a connector label broken before a closing bracket", () => {
		const result = validateDoc(
			JSON.stringify({
				version: 1,
				root: [
					{ id: "s", type: "rect", x: 0, y: 0, width: 100, height: 60 },
					{ id: "t", type: "rect", x: 400, y: 0, width: 100, height: 60 },
					{
						id: "edge",
						type: "connector",
						points: [],
						source: {
							owner: { id: "s" },
							anchor: { kind: "connectPoint", id: "rightCenter" },
						},
						target: {
							owner: { id: "t" },
							anchor: { kind: "connectPoint", id: "leftCenter" },
						},
						label: { text: "同期する\n）", fontSize: 12 },
					},
				],
			}),
		);
		expect(result.diagnostics).toEqual([]);
		const diagnostics = diagnoseDoc(result.doc as CanvasDoc);
		expect(diagnostics).toHaveLength(1);
		expect(diagnostics[0]).toMatchObject({
			severity: "warning",
			objectId: "edge",
		});
		// The authored break is shown rather than taken: a message is one line.
		expect(diagnostics[0].message).toMatch(
			/label "同期する\\n）" breaks a line .*line 2 starts with "）"/,
		);
	});
});
