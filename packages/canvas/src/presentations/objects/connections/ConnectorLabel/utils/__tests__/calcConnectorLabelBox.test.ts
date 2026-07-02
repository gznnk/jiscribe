import { describe, expect, it } from "vitest";

import {
	calcConnectorLabelBox,
	CONNECTOR_LABEL_MAX_WIDTH,
	CONNECTOR_LABEL_MIN_WIDTH,
	type ConnectorLabelFont,
} from "../connectorLabelLayout";

const font: ConnectorLabelFont = {
	fontSize: 16,
	fontFamily: "Noto Sans JP",
	fontWeight: "normal",
};

describe("calcConnectorLabelBox", () => {
	it("an empty string yields the minimum width and a positive height", () => {
		const box = calcConnectorLabelBox("", font);
		expect(box.width).toBe(CONNECTOR_LABEL_MIN_WIDTH);
		expect(box.height).toBeGreaterThan(0);
	});

	it("a sufficiently long single line is clamped to the maximum width", () => {
		const box = calcConnectorLabelBox("x".repeat(1000), font);
		expect(box.width).toBe(CONNECTOR_LABEL_MAX_WIDTH);
	});

	it("height increases as the line count increases", () => {
		const single = calcConnectorLabelBox("A", font);
		const triple = calcConnectorLabelBox("A\nB\nC", font);
		expect(triple.height).toBeGreaterThan(single.height);
	});

	it("the border width is added to the dimensions on all four sides (2×borderWidth)", () => {
		// for short text that does not wrap, the increase is purely the border amount.
		const noBorder = calcConnectorLabelBox("Yes", font, 0);
		const border3 = calcConnectorLabelBox("Yes", font, 3);
		expect(border3.width - noBorder.width).toBe(6);
		expect(border3.height - noBorder.height).toBe(6);
	});

	it("returns finite positive dimensions", () => {
		const box = calcConnectorLabelBox("Label", font);
		expect(Number.isFinite(box.width)).toBe(true);
		expect(Number.isFinite(box.height)).toBe(true);
		expect(box.width).toBeGreaterThan(0);
		expect(box.height).toBeGreaterThan(0);
	});
});
