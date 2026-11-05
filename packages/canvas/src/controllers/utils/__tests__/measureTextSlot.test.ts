import { TEXT_LINE_HEIGHT } from "@jiscribe/doc/text/layout/textLineHeight";
import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../states/objects/base/ObjectState";
import { createCanvasRegistries } from "../../registries/createCanvasRegistries";
import { measureTextSlot } from "../measureTextSlot";

/**
 * Widths come from the character-count estimate measureText falls back to
 * outside a browser, so these assertions turn on line *counts* and on the
 * region, not on exact pixel widths.
 */
const registries = createCanvasRegistries();
const FONT_SIZE = 16;
const LINE_HEIGHT = FONT_SIZE * TEXT_LINE_HEIGHT;

const textRect = (
	text: string,
	overrides: Record<string, unknown> = {},
): ObjectState =>
	({
		id: "r1",
		type: "rect",
		features: { type: "rect", geometry: "rect", text: "body" },
		cx: 0,
		cy: 0,
		width: 200,
		height: 100,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
		text: { body: { text, fontSize: FONT_SIZE } },
		...overrides,
	}) as unknown as ObjectState;

const measure = (object: ObjectState, slotId = "body") =>
	measureTextSlot(object, slotId, registries);

describe("measureTextSlot", () => {
	it("reports one line for a short text that fits", () => {
		const measurement = measure(textRect("ok"));
		expect(measurement?.lineCount).toBe(1);
		expect(measurement?.isOverflowing).toBe(false);
	});

	it("counts the lines an authored newline makes", () => {
		expect(measure(textRect("a\nb\nc"))?.lineCount).toBe(3);
	});

	it("counts the lines a text soft-wraps into inside a narrow shape", () => {
		const text = "one two three four five six";
		expect(measure(textRect(text, { width: 600 }))?.lineCount).toBe(1);
		expect(measure(textRect(text, { width: 60 }))?.lineCount).toBeGreaterThan(
			1,
		);
	});

	it("reports the text as clipped once the wrapped lines outgrow the shape", () => {
		// A box two lines tall, given enough text to wrap past it.
		const short = textRect("one two three four five six seven eight", {
			width: 60,
			height: LINE_HEIGHT * 2,
		});
		const measurement = measure(short);
		expect(measurement?.isOverflowing).toBe(true);
		expect(measurement?.textSize.height).toBeGreaterThan(
			measurement?.regionSize.height ?? 0,
		);
	});

	it("takes the whole box as the region for a type that registers no calculator", () => {
		expect(measure(textRect("ok"))?.regionSize).toEqual({
			width: 200,
			height: 100,
		});
	});

	it("places the region in world coordinates, around the shape's center", () => {
		expect(measure(textRect("ok", { cx: 300, cy: 150 }))?.bounds).toEqual({
			x: 200,
			y: 100,
			width: 200,
			height: 100,
		});
	});

	it("widens the reported bounds of a rotated shape without changing its region", () => {
		const measurement = measure(textRect("ok", { rotation: 90 }));
		// A quarter turn swaps the drawn extent; the room the text has does not change.
		expect(measurement?.bounds.width).toBeCloseTo(100);
		expect(measurement?.bounds.height).toBeCloseTo(200);
		expect(measurement?.regionSize).toEqual({ width: 200, height: 100 });
	});

	it("reports the room a flipped shape's text has as positive", () => {
		expect(measure(textRect("ok", { scaleX: -1 }))?.regionSize).toEqual({
			width: 200,
			height: 100,
		});
	});

	it("returns null for a slot the shape does not have", () => {
		expect(measure(textRect("ok"), "title")).toBeNull();
	});

	describe("a type that registers its own text measurer", () => {
		const measuredRegistries = createCanvasRegistries();
		const measuredCalls: unknown[] = [];
		measuredRegistries.objectTextMeasurer.register(
			"rect",
			(object, slotId, context) => {
				measuredCalls.push({ id: object.id, slotId, context });
				// Taller than any region below is wide, as a heading-led body would be.
				return { textSize: { width: 200, height: 150 }, lineCount: null };
			},
		);
		const measureWithOwn = (object: ObjectState) =>
			measureTextSlot(object, "body", measuredRegistries);

		it("is measured by that measurer, with the region and the resolved style", () => {
			measuredCalls.length = 0;
			const measurement = measureWithOwn(textRect("# Title"));
			expect(measuredCalls).toEqual([
				{
					id: "r1",
					slotId: "body",
					context: {
						regionSize: { width: 200, height: 100 },
						style: expect.objectContaining({ fontSize: FONT_SIZE }),
					},
				},
			]);
			expect(measurement?.textSize).toEqual({ width: 200, height: 150 });
			expect(measurement?.lineCount).toBeNull();
		});

		it("gets its overflow verdict and region from core", () => {
			const short = measureWithOwn(textRect("# Title"));
			expect(short?.isOverflowing).toBe(true);
			expect(short?.bounds).toEqual({
				x: -100,
				y: -50,
				width: 200,
				height: 100,
			});

			const tall = measureWithOwn(textRect("# Title", { height: 150.4 }));
			// Within OVERFLOW_TOLERANCE of the region counts as fitting.
			expect(tall?.isOverflowing).toBe(false);
		});

		it("leaves a type without a measurer on the plain-text layout", () => {
			const plain = measureTextSlot(
				{
					...textRect("a\nb\nc"),
					type: "ellipse",
				} as ObjectState,
				"body",
				measuredRegistries,
			);
			expect(plain?.lineCount).toBe(3);
		});
	});

	it("returns null for an object with no text region of its own", () => {
		const connector = {
			id: "c1",
			type: "connector",
			points: [],
			source: { anchor: { kind: "free", point: { x: 0, y: 0 } } },
			target: { anchor: { kind: "free", point: { x: 10, y: 0 } } },
		} as unknown as ObjectState;
		expect(measure(connector)).toBeNull();
	});
});
