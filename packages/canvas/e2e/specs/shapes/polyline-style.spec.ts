import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * 単体 Polyline（Polyline ツールで描いた図形そのもの）の線色・線種の設定と永続。
 *
 * connector-style はコネクター（自動結線）の線スタイルを守るが、Polyline ツールで描いた
 * 図形自身の line-color / line-style は未カバーだった（コネクターとは別の ObjectState・
 * 別メニュー経路）。設定が描画用ポリラインへ反映され、選択解除後も保持されることを
 * computed style で守る。
 *
 * Polyline は当たり判定用（data-id 付き・透明）と描画用（スタイル付き・data-kind なし）の
 * 2 要素で描かれ、スタイルは描画側にしか乗らないため、検証は描画要素に対して行う。
 */
async function visualStyle(
	canvas: CanvasDriver,
	id: string,
	prop: "stroke" | "stroke-dasharray",
): Promise<string> {
	const visual = await canvas.visualPolylineFor(id);
	return visual.evaluate(
		(el, p) => getComputedStyle(el).getPropertyValue(p),
		prop,
	);
}

test.describe("Polyline のスタイル", () => {
	test("線色を設定すると描画要素に反映され、選択解除後も保持される", async ({
		canvas,
	}) => {
		const id = await canvas.drawShape(
			"Polyline",
			{ x: 300, y: 300 },
			{ x: 600, y: 320 },
		);
		// drawShape 直後は自動選択され ObjectMenu が出る。

		const customStroke = await canvas.normalizeColor("#e11d48");
		await canvas.setColor("line-color", "#e11d48");
		await expect
			.poll(() => visualStyle(canvas, id, "stroke"), {
				message: "描画用ポリラインに線色が乗ること",
			})
			.toBe(customStroke);

		// 選択解除後も保持される。
		await canvas.deselect();
		expect(await visualStyle(canvas, id, "stroke")).toBe(customStroke);
	});

	test("線種を dashed にすると描画要素が破線になる", async ({ canvas }) => {
		const id = await canvas.drawShape(
			"Polyline",
			{ x: 300, y: 300 },
			{ x: 600, y: 320 },
		);

		// 既定は実線（dasharray なし）。
		const before = await visualStyle(canvas, id, "stroke-dasharray");
		expect(before === "" || before === "none").toBe(true);

		await canvas.setStrokeDashType("line-style", "dashed");
		await expect
			.poll(() => visualStyle(canvas, id, "stroke-dasharray"), {
				message: "破線化で stroke-dasharray が設定されること",
			})
			.not.toMatch(/^(none)?$/);
	});
});
