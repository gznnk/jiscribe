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

	describe("the same authored break, in a text and in a connector label", () => {
		/** A hand-typed newline that opens the next line with a full stop. */
		const HAND_BROKEN_TEXT = "手で折り返した行\n。続きの行";

		it("warns about a text whose width nothing stores, at the break the author typed", () => {
			// A `text` in its label layout is measured from its own content, so
			// nothing wraps it: its lines are the authored ones, and a line opening
			// on a full stop is still one.
			const diagnostics = diagnoseDoc(
				docOf({
					id: "note",
					type: "text",
					x: 0,
					y: 0,
					text: HAND_BROKEN_TEXT,
					fontSize: 16,
				}),
			);
			expect(diagnostics).toHaveLength(1);
			expect(diagnostics[0]).toMatchObject({
				severity: "warning",
				objectId: "note",
			});
			expect(diagnostics[0].message).toMatch(
				/line 2 starts with "。" \(nothing wraps it, font 16px\)/,
			);
		});

		it("passes over the same text once it ends where its authored line does", () => {
			expect(
				diagnoseDoc(
					docOf({
						id: "note",
						type: "text",
						x: 0,
						y: 0,
						text: "手で折り返した行。\n続きの行",
						fontSize: 16,
					}),
				),
			).toEqual([]);
		});

		it("warns about the very same break in a connector label", () => {
			// Nothing wraps a label either, and it is checked the same way.
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
							label: { text: HAND_BROKEN_TEXT, fontSize: 12 },
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
			expect(diagnostics[0].message).toMatch(/line 2 starts with "。"/);
		});
	});

	describe("a label its type hangs outside the box", () => {
		const actorWith = (text: string) =>
			docOf({
				id: "person",
				type: "actor",
				x: 0,
				y: 0,
				width: 40,
				height: 60,
				text,
			});

		it("warns about a line the author opened on a full stop, nothing wrapping the label", () => {
			const diagnostics = diagnoseDoc(actorWith("利用者\n。管理者"));
			expect(diagnostics).toHaveLength(1);
			expect(diagnostics[0]).toMatchObject({
				severity: "warning",
				objectId: "person",
			});
			// Measured at the type's own size (16px), which is what the label is drawn at.
			expect(diagnostics[0].message).toMatch(
				/^text in actor breaks a line .*line 2 starts with "。" \(nothing wraps it, font 16px\)$/,
			);
		});

		it("does not wrap a label longer than the box, so finds no break in it", () => {
			expect(
				diagnoseDoc(actorWith("ずっと長い名前のついた登場人物。続きの説明。")),
			).toEqual([]);
		});
	});

	it("warns about a line the author opened on a full stop in an AWS group's title, nothing wrapping it", () => {
		const diagnostics = diagnoseDoc(
			docOf({
				id: "vpc",
				type: "awsGroup",
				x: 0,
				y: 0,
				width: 320,
				height: 200,
				text: "本番環境\n。VPC",
			}),
		);
		expect(diagnostics).toHaveLength(1);
		expect(diagnostics[0]).toMatchObject({
			severity: "warning",
			objectId: "vpc",
		});
		expect(diagnostics[0].message).toMatch(
			/^text in awsGroup breaks a line .*line 2 starts with "。" \(nothing wraps it, font 14px\)$/,
		);
	});

	it("still passes over an ellipse, whose doc stores no width to wrap at", () => {
		expect(
			diagnoseDoc(
				docOf({
					id: "oval",
					type: "ellipse",
					cx: 0,
					cy: 0,
					rx: 100,
					ry: 50,
					text: "手で折り返した行\n。続きの行",
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
