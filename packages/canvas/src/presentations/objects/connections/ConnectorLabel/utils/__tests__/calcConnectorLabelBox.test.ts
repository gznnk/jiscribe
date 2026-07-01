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
	it("空文字は最小幅・正の高さになる", () => {
		const box = calcConnectorLabelBox("", font);
		expect(box.width).toBe(CONNECTOR_LABEL_MIN_WIDTH);
		expect(box.height).toBeGreaterThan(0);
	});

	it("十分に長い 1 行は最大幅にクランプされる", () => {
		const box = calcConnectorLabelBox("x".repeat(1000), font);
		expect(box.width).toBe(CONNECTOR_LABEL_MAX_WIDTH);
	});

	it("行数が増えると高さが増える", () => {
		const single = calcConnectorLabelBox("A", font);
		const triple = calcConnectorLabelBox("A\nB\nC", font);
		expect(triple.height).toBeGreaterThan(single.height);
	});

	it("枠線幅は寸法に上下左右ぶん（2×borderWidth）上乗せされる", () => {
		// 折り返さない短文では枠線分だけ純粋に増える。
		const noBorder = calcConnectorLabelBox("Yes", font, 0);
		const border3 = calcConnectorLabelBox("Yes", font, 3);
		expect(border3.width - noBorder.width).toBe(6);
		expect(border3.height - noBorder.height).toBe(6);
	});

	it("寸法は有限の正数を返す", () => {
		const box = calcConnectorLabelBox("Label", font);
		expect(Number.isFinite(box.width)).toBe(true);
		expect(Number.isFinite(box.height)).toBe(true);
		expect(box.width).toBeGreaterThan(0);
		expect(box.height).toBeGreaterThan(0);
	});
});
