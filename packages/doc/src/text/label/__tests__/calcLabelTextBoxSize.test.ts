import { beforeEach, describe, expect, it, vi } from "vitest";

import type { TextSlot } from "../../../model/objects/types/text/TextSlot";
import * as textBlock from "../../block/calcTextBlockSize";
import { advanceTextMeasurementGeneration } from "../../measure/textMeasurementSlot";
import { calcLabelTextBoxSize } from "../calcLabelTextBoxSize";

// Passed through, so the sizes stay real while the measurements can be counted.
vi.mock("../../block/calcTextBlockSize", async (importOriginal) => {
	const original = await importOriginal<typeof textBlock>();
	return { ...original, calcTextBlockSize: vi.fn(original.calcTextBlockSize) };
});

describe("calcLabelTextBoxSize caching on the body", () => {
	beforeEach(() => {
		vi.mocked(textBlock.calcTextBlockSize).mockClear();
	});

	it("measures a body handed over again only once", () => {
		const body: Partial<TextSlot> = { text: "Customer" };
		const size = calcLabelTextBoxSize(body, undefined);
		expect(calcLabelTextBoxSize(body, undefined)).toEqual(size);
		expect(textBlock.calcTextBlockSize).toHaveBeenCalledTimes(1);
	});

	it("measures afresh a body whose text was rewritten in place", () => {
		const body: Partial<TextSlot> = { text: "Customer" };
		const size = calcLabelTextBoxSize(body, undefined);
		body.text = "Customer account";
		expect(calcLabelTextBoxSize(body, undefined)).not.toEqual(size);
		expect(textBlock.calcTextBlockSize).toHaveBeenCalledTimes(2);
	});

	it("measures afresh a body whose font was rewritten in place", () => {
		const body: Partial<TextSlot> = { text: "Customer" };
		const size = calcLabelTextBoxSize(body, undefined);
		body.fontSize = 40;
		expect(calcLabelTextBoxSize(body, undefined)).not.toEqual(size);
	});

	it("measures afresh under other type defaults", () => {
		const body: Partial<TextSlot> = { text: "Customer" };
		const size = calcLabelTextBoxSize(body, { fontSize: 12 });
		expect(calcLabelTextBoxSize(body, { fontSize: 24 })).not.toEqual(size);
	});

	it("measures the body again once the measurement generation moves on", () => {
		const body: Partial<TextSlot> = { text: "Customer" };
		calcLabelTextBoxSize(body, undefined);
		advanceTextMeasurementGeneration();
		calcLabelTextBoxSize(body, undefined);
		calcLabelTextBoxSize(body, undefined);
		expect(textBlock.calcTextBlockSize).toHaveBeenCalledTimes(2);
	});

	it("hands each caller a size of its own", () => {
		const body: Partial<TextSlot> = { text: "Customer" };
		const first = calcLabelTextBoxSize(body, undefined);
		first.width = 0;
		expect(calcLabelTextBoxSize(body, undefined).width).not.toBe(0);
	});
});
