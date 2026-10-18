import { describe, expect, it } from "vitest";

import {
	ER_ENTITY_DEFAULT_NAME_WIDTH,
	ER_ENTITY_DEFAULT_TYPE_WIDTH,
} from "../../schema/ErEntityDoc";
import type {
	ErEntityColumnDoc,
	ErEntityTextDoc,
} from "../../schema/ErEntityDoc";
import { calcErEntityLayout } from "../calcErEntityLayout";
import { distributeErEntityWidthToSlots } from "../distributeErEntityWidthToSlots";
import {
	calcErEntityMinWidth,
	calcErEntitySlotFloors,
	fitErEntitySlotWidths,
	sumErEntitySlotWidths,
} from "../erEntitySlotWidths";
import {
	readErEntityDocLayoutInput,
	readErEntityTextSlotsLayoutSource,
} from "../readErEntityLayoutSource";

// Measured on the estimate (vitest.setup.ts): every character is 0.6 em wide.

const USERS_COLUMNS: ErEntityColumnDoc[] = [
	{ key: "PK", name: "id", type: "bigint" },
	{ key: "FK", name: "org_id", type: "bigint" },
	{ name: "email", type: "varchar(255)" },
	{ name: "name", type: "varchar(80) null" },
	{ name: "created_at", type: "timestamp" },
];

type LayoutFields = {
	keyWidth?: number;
	nameWidth?: number;
	typeWidth?: number;
	/** Type size stated on every text, each written in the slot form; omitted leaves the texts as given. */
	fontSize?: number;
	name?: string;
};

/** `text` in the slot form stating `fontSize`, or as given when no size is asked for. */
const sizedText = (
	text: ErEntityTextDoc | undefined,
	fontSize: number | undefined,
): ErEntityTextDoc | undefined =>
	text === undefined || fontSize === undefined || typeof text !== "string"
		? text
		: { text, fontSize };

const inputOf = (columns: ErEntityColumnDoc[], fields: LayoutFields = {}) =>
	readErEntityDocLayoutInput({
		keyWidth: fields.keyWidth,
		nameWidth: fields.nameWidth ?? 96,
		typeWidth: fields.typeWidth ?? 100,
		name: sizedText(fields.name ?? "users", fields.fontSize),
		columns: columns.map((column) => ({
			...(column.key !== undefined && {
				key: sizedText(column.key, fields.fontSize),
			}),
			name: sizedText(column.name, fields.fontSize) ?? "",
			...(column.type !== undefined && {
				type: sizedText(column.type, fields.fontSize),
			}),
		})),
	});

const sourceOf = (columns: ErEntityColumnDoc[], fields: LayoutFields = {}) =>
	readErEntityTextSlotsLayoutSource(inputOf(columns, fields));

const heightOf = (columns: ErEntityColumnDoc[], fields: LayoutFields = {}) =>
	calcErEntityLayout(inputOf(columns, fields)).height;

describe("calcErEntityLayout height", () => {
	it("sums the title band and the rows (28 + 125)", () => {
		expect(heightOf(USERS_COLUMNS)).toBe(153);
	});

	it("keeps one row for an entity with no columns", () => {
		expect(heightOf([])).toBe(28 + 25);
	});

	it("does not change when a column gains or loses the PK token", () => {
		expect(heightOf([{ key: "PK", name: "id" }])).toBe(
			heightOf([{ name: "id" }]),
		);
	});

	it("follows the type size: the row pitch is 1.5 em plus the text box padding", () => {
		expect(heightOf([{ name: "a" }], { fontSize: 20 })).toBe(30 + 7 + (30 + 4));
	});

	it("grows the title band with a name too long for the width", () => {
		const longName = "a_very_long_entity_name_that_wraps";
		expect(heightOf([], { name: longName })).toBeGreaterThan(
			heightOf([], { name: "a" }),
		);
	});
});

describe("calcErEntityLayout", () => {
	it("draws the rows in declared order whatever their keys", () => {
		const layout = calcErEntityLayout(
			inputOf([
				{ name: "a" },
				{ key: "PK", name: "b" },
				{ name: "c" },
				{ key: "pk, fk", name: "d" },
			]),
		);
		expect(layout.rows.map((row) => row.columnIndex)).toEqual([0, 1, 2, 3]);
	});

	it("tiles the box under the title band with the rows, no gap above, between or below", () => {
		const layout = calcErEntityLayout(
			inputOf(USERS_COLUMNS, { typeWidth: 155 }),
		);
		// Key 29 ("PK"), name 96, type 155.
		const top = -layout.height / 2;
		expect(layout.width).toBe(280);
		expect(layout.header).toEqual({ x: -140, y: top, width: 280, height: 28 });
		layout.rows.forEach(({ band }, rowIndex) => {
			expect(band).toEqual({
				x: -140,
				y: top + 28 + rowIndex * 25,
				width: 280,
				height: 25,
			});
		});
		const lastBand = layout.rows[layout.rows.length - 1].band;
		expect(lastBand.y + lastBand.height).toBe(layout.height / 2);
	});

	it("sizes the key gutter to the widest key, never under 24", () => {
		expect(calcErEntityLayout(inputOf([{ name: "a" }])).keyWidth).toBe(24);
		// "PK, FK" at 14 px: 6 × 8.4 = 50.4, rounded up, plus 6 px padding each side.
		expect(
			calcErEntityLayout(inputOf([{ key: "PK, FK", name: "a" }])).keyWidth,
		).toBe(63);
	});

	it("measures the key gutter in the key's own font", () => {
		// 2 chars at 20 px: 24, plus 6 px padding each side.
		expect(
			calcErEntityLayout(
				inputOf([{ key: { text: "PK", fontSize: 20 }, name: "a" }]),
			).keyWidth,
		).toBe(36);
		// A size stated on the key in the slot form reaches it as it is.
		expect(
			calcErEntityLayout(inputOf([{ key: "PK", name: "a" }], { fontSize: 20 }))
				.keyWidth,
		).toBe(36);
	});

	it("sizes each row to the largest text it holds, the rows below moving down", () => {
		const layout = calcErEntityLayout(
			inputOf([
				{ name: "a" },
				{ name: "b", type: { text: "int", fontSize: 20 } },
				{ name: "c" },
			]),
		);
		const top = -layout.height / 2;
		expect(layout.rows.map((row) => row.band.height)).toEqual([25, 34, 25]);
		expect(layout.rows.map((row) => row.band.y - top)).toEqual([
			28,
			28 + 25,
			28 + 25 + 34,
		]);
		expect(layout.height).toBe(28 + 25 + 34 + 25);
	});

	it("sizes a row whose texts all state one size to that size", () => {
		const layout = calcErEntityLayout(
			inputOf([{ key: "PK", name: "id" }], { fontSize: 20 }),
		);
		expect(layout.rows[0].band.height).toBe(34);
	});

	it("grows a row for a key stated larger than its name", () => {
		const layout = calcErEntityLayout(
			inputOf([{ key: { text: "PK", fontSize: 30 }, name: "id" }]),
		);
		expect(layout.rows[0].band.height).toBe(30 * 1.5 + 4);
	});

	it("measures the title band with the title's own size", () => {
		const layout = calcErEntityLayout(inputOf([]));
		const styled = calcErEntityLayout(
			readErEntityDocLayoutInput({
				name: { text: "users", fontSize: 20 },
				columns: [],
			}),
		);
		expect(layout.header.height).toBe(28);
		expect(styled.header.height).toBe(30 + 7);
	});

	it("keeps the empty entity's row at the default size whatever the title's size", () => {
		expect(heightOf([], { fontSize: 20 })).toBe(30 + 7 + 25);
	});

	it("draws the name and the type at their stated widths, the box their sum", () => {
		const layout = calcErEntityLayout(inputOf([{ name: "a", type: "int" }]));
		expect(layout.keyWidth).toBe(24);
		expect(layout.nameWidth).toBe(96);
		expect(layout.typeWidth).toBe(100);
		expect(layout.width).toBe(220);
	});

	it("draws a slot stated narrower than its texts at its floor, before the content resizer has run", () => {
		// "varchar(255)": 100.8, rounded up, plus 6 px padding each side.
		const layout = calcErEntityLayout(
			inputOf([{ name: "a", type: "varchar(255)" }], { typeWidth: 60 }),
		);
		expect(layout.typeWidth).toBe(113);
		expect(layout.nameWidth).toBe(96);
		expect(layout.width).toBe(24 + 96 + 113);
	});
});

describe("calcErEntitySlotFloors", () => {
	it("is the fixed minimums for an entity with no columns", () => {
		expect(calcErEntitySlotFloors(sourceOf([]))).toEqual({
			keyWidth: 24,
			nameWidth: 24,
			typeWidth: 60,
		});
	});

	it("is the widest text of each slot plus the padding", () => {
		// "PK" 16.8, "created_at" 84, "varchar(80) null" 134.4; each rounded up plus 12.
		expect(calcErEntitySlotFloors(sourceOf(USERS_COLUMNS))).toEqual({
			keyWidth: 29,
			nameWidth: 96,
			typeWidth: 147,
		});
	});

	it("measures every text in its own font", () => {
		// "user_name" at 20 px: 9 × 12 = 108, plus 12.
		expect(
			calcErEntitySlotFloors(
				sourceOf([{ name: { text: "user_name", fontSize: 20 } }]),
			).nameWidth,
		).toBe(120);
	});
});

describe("stated slot widths", () => {
	it("uses a stated key width, even narrower than the widest key's would be", () => {
		const layout = calcErEntityLayout(
			inputOf([{ key: "PK", name: "a" }], { keyWidth: 40 }),
		);
		expect(layout.keyWidth).toBe(40);
		expect(layout.width).toBe(40 + 96 + 100);
	});

	it("reads a malformed stated width on a doc as not stated, a name or type one as its default", () => {
		const source = readErEntityDocLayoutInput({
			keyWidth: "wide" as unknown as number,
			nameWidth: Number.NaN,
			typeWidth: "wide" as unknown as number,
			columns: [],
		});
		expect(source).not.toHaveProperty("keyWidth");
		expect(source.nameWidth).toBe(ER_ENTITY_DEFAULT_NAME_WIDTH);
		expect(source.typeWidth).toBe(ER_ENTITY_DEFAULT_TYPE_WIDTH);
	});
});

describe("fitErEntitySlotWidths", () => {
	const floors = { keyWidth: 29, nameWidth: 54, typeWidth: 63 };

	it("hands back the widths themselves when every slot fits", () => {
		const widths = { keyWidth: 30, nameWidth: 60, typeWidth: 70 };
		expect(fitErEntitySlotWidths(widths, floors)).toBe(widths);
	});

	it("raises each slot under its floor, the others kept", () => {
		expect(
			fitErEntitySlotWidths(
				{ keyWidth: 24, nameWidth: 100, typeWidth: 40 },
				floors,
			),
		).toEqual({ keyWidth: 29, nameWidth: 100, typeWidth: 63 });
	});

	it("gives the name what the three fall short of the static minimum", () => {
		expect(
			fitErEntitySlotWidths(
				{ keyWidth: 24, nameWidth: 24, typeWidth: 60 },
				{ keyWidth: 24, nameWidth: 24, typeWidth: 60 },
			),
		).toEqual({ keyWidth: 24, nameWidth: 36, typeWidth: 60 });
	});
});

describe("distributeErEntityWidthToSlots", () => {
	const floors = { keyWidth: 24, nameWidth: 54, typeWidth: 60 };
	const start = { keyWidth: 30, nameWidth: 100, typeWidth: 100 };

	it("splits the width the key gutter leaves by the name's and the type's px", () => {
		expect(distributeErEntityWidthToSlots(start, 330, floors)).toEqual({
			keyWidth: 30,
			nameWidth: 150,
			typeWidth: 150,
		});
		expect(
			distributeErEntityWidthToSlots(
				{ keyWidth: 30, nameWidth: 100, typeWidth: 300 },
				230,
				floors,
			),
		).toEqual({ keyWidth: 30, nameWidth: 54, typeWidth: 146 });
	});

	it("rounds the name to whole px, the type taking the rest to the size precision", () => {
		const widths = distributeErEntityWidthToSlots(start, 231.123456, floors);
		expect(widths.nameWidth).toBe(101);
		expect(widths.typeWidth).toBe(100.1235);
		expect(sumErEntitySlotWidths(widths)).toBe(231.1235);
	});

	it("pins a column whose share falls under its floor, the other taking the rest", () => {
		expect(
			distributeErEntityWidthToSlots(
				{ keyWidth: 30, nameWidth: 300, typeWidth: 100 },
				170,
				floors,
			),
		).toEqual({ keyWidth: 30, nameWidth: 80, typeWidth: 60 });
	});

	it("raises a width under the key gutter plus both floors to it", () => {
		for (const width of [0, -20, 100]) {
			expect(distributeErEntityWidthToSlots(start, width, floors)).toEqual({
				keyWidth: 30,
				nameWidth: 54,
				typeWidth: 60,
			});
		}
	});

	it("splits evenly when the name and the type hold nothing", () => {
		expect(
			distributeErEntityWidthToSlots(
				{ keyWidth: 30, nameWidth: 0, typeWidth: 0 },
				330,
				floors,
			),
		).toEqual({ keyWidth: 30, nameWidth: 150, typeWidth: 150 });
	});
});

describe("calcErEntityMinWidth", () => {
	it("is the key gutter plus the name and type floors", () => {
		// "PK" 29, "created_at" 96, "varchar(80) null" 147.
		const floors = calcErEntitySlotFloors(sourceOf(USERS_COLUMNS));
		expect(calcErEntityMinWidth(29, floors)).toBe(29 + 96 + 147);
		expect(calcErEntityMinWidth(50, floors)).toBe(50 + 96 + 147);
	});

	it("is never below the static minimum", () => {
		expect(calcErEntityMinWidth(24, calcErEntitySlotFloors(sourceOf([])))).toBe(
			120,
		);
	});
});
