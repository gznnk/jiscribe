import type { CanvasDoc } from "@jiscribe/canvas";
import { describe, expect, it } from "vitest";

import type { CanvasMergeConflict } from "../viewer/mergeCanvasDocs";
import {
	formatMergeConflictMessage,
	MERGE_CONFLICT_MESSAGE_PREFIX,
} from "../viewer/mergeConflictMessage";

type Json = Record<string, unknown>;

const doc = (root: Json[]): CanvasDoc =>
	({ version: 1, root }) as unknown as CanvasDoc;

const changedOnBoth = (id: string): CanvasMergeConflict => ({
	kind: "object",
	id,
	reason: "changed-on-both",
});

/** The message with its fixed opening taken off */
const describeDropped = (
	conflicts: CanvasMergeConflict[],
	docs: CanvasDoc[],
): string => {
	const message = formatMergeConflictMessage(conflicts, docs);
	expect(message.startsWith(MERGE_CONFLICT_MESSAGE_PREFIX)).toBe(true);
	return message.slice(MERGE_CONFLICT_MESSAGE_PREFIX.length);
};

describe("formatMergeConflictMessage", () => {
	it("names an object by its text, not its id", () => {
		const theirs = doc([
			{ type: "rect", id: "51c78401-69fa-4b1e", text: "ログイン画面" },
		]);

		expect(
			describeDropped([changedOnBoth("51c78401-69fa-4b1e")], [theirs]),
		).toBe("「ログイン画面」");
	});

	it("reads styled runs, rows and a slotted type's first slot holding text", () => {
		const theirs = doc([
			{
				type: "rect",
				id: "runs",
				text: [{ text: "太字" }, { text: "と普通" }],
			},
			{ type: "rect", id: "rows", text: ["一行目", "二行目"] },
			{
				type: "umlClass",
				id: "slots",
				text: { name: { text: "" }, body: { text: "User" } },
			},
		]);

		expect(
			describeDropped(
				[changedOnBoth("runs"), changedOnBoth("rows"), changedOnBoth("slots")],
				[theirs],
			),
		).toBe("「太字と普通」、「一行目 二行目」、「User」");
	});

	it("names a connector by its label", () => {
		const theirs = doc([
			{ type: "connector", id: "c1", label: { text: "呼び出す" } },
		]);

		expect(describeDropped([changedOnBoth("c1")], [theirs])).toBe(
			"「呼び出す」",
		);
	});

	it("cuts a long text short, counting characters rather than code units", () => {
		const theirs = doc([
			{ type: "rect", id: "r1", text: "𠮷".repeat(20) },
			{ type: "rect", id: "r2", text: "  改行を\n\t含む  " },
		]);

		expect(
			describeDropped([changedOnBoth("r1"), changedOnBoth("r2")], [theirs]),
		).toBe(`「${"𠮷".repeat(16)}…」、「改行を 含む」`);
	});

	it("falls back to the type for an object with no text, counting repeats", () => {
		const theirs = doc([
			{ type: "rect", id: "r1" },
			{ type: "rect", id: "r2", text: "   " },
			{ type: "ellipse", id: "e1" },
		]);

		expect(
			describeDropped(
				[changedOnBoth("r1"), changedOnBoth("r2"), changedOnBoth("e1")],
				[theirs],
			),
		).toBe("rect 2 個、ellipse");
	});

	it("finds an object inside a group", () => {
		const theirs = doc([
			{
				type: "group",
				id: "g1",
				children: [{ type: "rect", id: "inner", text: "中" }],
			},
		]);

		expect(describeDropped([changedOnBoth("inner")], [theirs])).toBe("「中」");
	});

	it("names an object the file deleted from the next doc given", () => {
		const theirs = doc([]);
		const mine = doc([{ type: "rect", id: "r1", text: "消された" }]);

		expect(
			describeDropped(
				[{ kind: "object", id: "r1", reason: "deleted-there" }],
				[theirs, mine],
			),
		).toBe("「消された」");
	});

	it("prefers the file's text to the person's", () => {
		const theirs = doc([{ type: "rect", id: "r1", text: "AI の文言" }]);
		const mine = doc([{ type: "rect", id: "r1", text: "人の文言" }]);

		expect(describeDropped([changedOnBoth("r1")], [theirs, mine])).toBe(
			"「AI の文言」",
		);
	});

	it("calls an object found nowhere 図形", () => {
		expect(describeDropped([changedOnBoth("gone")], [doc([])])).toBe("図形");
	});

	it("names an object once when it was both changed and moved", () => {
		const theirs = doc([{ type: "rect", id: "r1", text: "箱" }]);

		expect(
			describeDropped(
				[changedOnBoth("r1"), { kind: "placement", id: "r1" }],
				[theirs],
			),
		).toBe("「箱」");
	});

	it("counts the objects once there are more than three", () => {
		const theirs = doc(
			["a", "b", "c", "d"].map((id) => ({ type: "rect", id, text: id })),
		);

		expect(
			describeDropped(["a", "b", "c", "d"].map(changedOnBoth), [theirs]),
		).toBe("4 個の図形");
	});

	it("names stacking orders and document fields after the objects", () => {
		const theirs = doc([
			{ type: "rect", id: "r1", text: "箱" },
			{ type: "group", id: "g1", children: [] },
		]);

		expect(
			describeDropped(
				[
					{ kind: "field", key: "background" },
					{ kind: "order", id: null },
					{ kind: "order", id: "g1" },
					{ kind: "field", key: "view" },
					{ kind: "field", key: "custom" },
					changedOnBoth("r1"),
				],
				[theirs],
			),
		).toBe("「箱」、背景色、重なり順、group の中の重なり順、表示範囲、custom");
	});
});
