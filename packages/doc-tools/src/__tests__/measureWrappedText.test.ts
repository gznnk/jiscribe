import { describe, expect, it } from "vitest";

import { measureWrappedText } from "../measureWrappedText";
import { resolveContentBox } from "../resolveContentBox";

const SANS_STACK = '"Source Sans 3", "Noto Sans JP", sans-serif';

const sansFont = (fontSize: number, fontWeight = "normal") => ({
	fontSize,
	fontFamily: SANS_STACK,
	fontWeight,
});

describe("measureWrappedText", () => {
	it("fits a stadium label that the drawn diagram fits", () => {
		// The pill of a real diagram: 240 x 80 at 13px leaves 148px to wrap in, and
		// the label measures 129.35px, so it stays one line.
		const resolution = resolveContentBox({
			type: "stadium",
			width: 240,
			height: 80,
		});
		const box = resolution.kind === "region" ? resolution.rect : null;
		const metrics = measureWrappedText(
			"チャットアシスタント",
			sansFont(13),
			box?.width,
		);
		expect(metrics.lines).toBe(1);
		expect(metrics.width).toBeLessThan(box?.width ?? 0);
		expect(metrics.height).toBeLessThan(box?.height ?? 0);
	});

	it("counts an empty text as one line of the font's own height", () => {
		expect(measureWrappedText("", sansFont(16), 100)).toMatchObject({
			lines: 1,
			width: 0,
			height: 24,
		});
	});

	it("counts the lines the author typed when no width is given", () => {
		expect(measureWrappedText("one\ntwo\nthree", sansFont(16)).lines).toBe(3);
	});

	it("wraps Japanese between characters", () => {
		// Each character is about 13px wide, so 40px holds three of them.
		expect(
			measureWrappedText("あいうえおかきくけこ", sansFont(13), 40).lines,
		).toBe(4);
	});

	it("reports the widest line, not the last", () => {
		// The wider first line, its trailing space included — the space hangs past
		// the edge under pre-wrap, so it never decides the break but is still drawn.
		const metrics = measureWrappedText("Hello Hi", sansFont(16), 40);
		expect(metrics.lines).toBe(2);
		expect(metrics.width).toBeCloseTo(
			measureWrappedText("Hello ", sansFont(16)).width,
			3,
		);
	});

	it("makes a line as tall as the largest type size drawn on it", () => {
		const metrics = measureWrappedText(
			[{ text: "small " }, { text: "large", fontSize: 32 }],
			sansFont(16),
			500,
		);
		expect(metrics.lines).toBe(1);
		expect(metrics.height).toBe(32 * 1.5);
	});
});
