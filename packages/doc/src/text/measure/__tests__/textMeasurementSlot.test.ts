import { beforeEach, describe, expect, it } from "vitest";

import { createEstimateTextMeasurement } from "../TextMeasurement";
import type {
	TextMeasurement,
	TextMeasurementSource,
} from "../TextMeasurement";
import {
	adoptTextMeasurement,
	offerTextMeasurement,
	resetTextMeasurementForTests,
} from "../textMeasurementSlot";

/**
 * A measurement of the given standing, distinguishable from every other one this
 * file builds: the slot compares offers by identity, so each call is a candidate
 * of its own however alike two of them measure.
 */
const measurementOf = (source: TextMeasurementSource): TextMeasurement => ({
	source,
	createMeasurer: (font) => (text) => text.length * font.fontSize,
});

describe("the text measurement slot before anything has measured", () => {
	beforeEach(() => {
		resetTextMeasurementForTests();
	});

	it("adopts a stronger implementation over the one standing", () => {
		const estimate = measurementOf("estimate");
		const renderer = measurementOf("renderer");
		offerTextMeasurement(estimate);

		offerTextMeasurement(renderer);

		expect(adoptTextMeasurement()).toBe(renderer);
	});

	it("declines a weaker one", () => {
		const renderer = measurementOf("renderer");
		offerTextMeasurement(renderer);

		offerTextMeasurement(measurementOf("font-metrics"));

		expect(adoptTextMeasurement()).toBe(renderer);
	});

	it("takes the same instance again as a no-op, which is what lets an entry point offer on every call", () => {
		const fontMetrics = measurementOf("font-metrics");
		offerTextMeasurement(fontMetrics);

		offerTextMeasurement(fontMetrics);

		expect(adoptTextMeasurement()).toBe(fontMetrics);
	});

	it("refuses a second implementation of the same standing", () => {
		offerTextMeasurement(measurementOf("renderer"));

		expect(() => offerTextMeasurement(measurementOf("renderer"))).toThrow(
			/Two different "renderer"/,
		);
	});
});

describe("the text measurement slot once something has measured", () => {
	beforeEach(() => {
		resetTextMeasurementForTests();
	});

	it("seals the adoption, so a later reading is the same instance", () => {
		const estimate = createEstimateTextMeasurement();
		offerTextMeasurement(estimate);

		expect(adoptTextMeasurement()).toBe(estimate);
		expect(adoptTextMeasurement()).toBe(estimate);
	});

	it("declines a weaker offer in silence — a Node tool offering font metrics where the canvas is drawing", () => {
		const renderer = measurementOf("renderer");
		offerTextMeasurement(renderer);
		adoptTextMeasurement();

		offerTextMeasurement(measurementOf("font-metrics"));

		expect(adoptTextMeasurement()).toBe(renderer);
	});

	it("refuses a stronger offer, rather than answering differently from here on", () => {
		offerTextMeasurement(measurementOf("estimate"));
		adoptTextMeasurement();

		expect(() => offerTextMeasurement(measurementOf("renderer"))).toThrow(
			/offered after "estimate" had already measured/,
		);
	});

	it("declines another instance of the same standing in silence, unlike before the seal", () => {
		// The pre-seal throw exists to surface two hosts contending; after the seal
		// the answer is settled, and a late arrival of the losing twin (a second
		// test file's setup, say) changes nothing worth crashing over.
		const renderer = measurementOf("renderer");
		offerTextMeasurement(renderer);
		adoptTextMeasurement();

		offerTextMeasurement(measurementOf("renderer"));

		expect(adoptTextMeasurement()).toBe(renderer);
	});
});

describe("the text measurement slot with nothing offered", () => {
	beforeEach(() => {
		resetTextMeasurementForTests();
	});

	it("refuses to measure, naming the implementations a host can offer", () => {
		expect(() => adoptTextMeasurement()).toThrow(
			/No text measurement has been offered/,
		);
	});
});
