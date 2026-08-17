import { describe, expect, it } from "vitest";

import { TEXT_BLOCK_MIN_WIDTH } from "../../../../../../states/objects/utils/calcTextBlockSize";
import {
	calcConnectorLabelBox,
	resolveConnectorLabelBox,
	CONNECTOR_LABEL_DEFAULTS,
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
		expect(box.width).toBe(TEXT_BLOCK_MIN_WIDTH);
		expect(box.height).toBeGreaterThan(0);
	});

	it("grows sideways with the line however long it gets, rather than wrapping", () => {
		const long = calcConnectorLabelBox("x".repeat(500), font);
		const longer = calcConnectorLabelBox("x".repeat(1000), font);
		expect(longer.width).toBeGreaterThan(long.width);
		expect(longer.height).toBe(long.height);
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

describe("resolveConnectorLabelBox", () => {
	it("an unstyled label resolves to the default font and no border", () => {
		expect(resolveConnectorLabelBox({ text: "Yes" })).toEqual(
			calcConnectorLabelBox(
				"Yes",
				{
					fontSize: CONNECTOR_LABEL_DEFAULTS.fontSize,
					fontFamily: CONNECTOR_LABEL_DEFAULTS.fontFamily,
					fontWeight: CONNECTOR_LABEL_DEFAULTS.fontWeight,
				},
				0,
			),
		);
	});

	it("styled values from the label win over the defaults", () => {
		const styled = resolveConnectorLabelBox({
			text: "Yes",
			fontSize: 32,
			fontWeight: "bold",
			strokeWidth: 3,
		});

		expect(styled).toEqual(
			calcConnectorLabelBox(
				"Yes",
				{
					fontSize: 32,
					fontFamily: CONNECTOR_LABEL_DEFAULTS.fontFamily,
					fontWeight: "bold",
				},
				3,
			),
		);
		expect(styled.height).toBeGreaterThan(
			resolveConnectorLabelBox({ text: "Yes" }).height,
		);
	});
});
