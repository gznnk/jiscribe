import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * コネクターのスタイル設定（線色・線種）の反映と永続。
 *
 * object-menu.spec は図形（ポリライン）の破線化を守るが、コネクター自身のスタイル設定は
 * 未カバーだった。コネクターは当たり判定用（透明・data-id 付き）と描画用（スタイル付き・
 * data-kind なし）の 2 要素で描かれ、スタイルは描画側にしか乗らない。設定が描画要素へ
 * 反映され、選択解除後も保持されることを computed style で守る。
 */

/** 上下 2 矩形を縦コネクターで結び、コネクター ID を返す（接続後は選択解除済み） */
async function buildConnector(canvas: CanvasDriver): Promise<string> {
	await canvas.drawShape("Rectangle", { x: 400, y: 150 }, { x: 600, y: 250 });
	await canvas.deselect();
	await canvas.drawShape("Rectangle", { x: 400, y: 450 }, { x: 600, y: 550 });
	await canvas.deselect();

	await canvas.selectAt({ x: 500, y: 200 });
	const connectorId = await canvas.createConnector("bottomCenter", {
		x: 500,
		y: 450,
	});
	await canvas.deselect();
	return connectorId;
}

/**
 * 描画用ポリライン（data-kind なし）の computed style を読む。
 * 描画要素は矢印分だけ端を inset するため当たり判定用とは points が一致しない。
 * キャンバス上のポリラインはコネクターの当たり判定用（data-kind 付き）と描画用のみのため、
 * data-kind なしのポリラインを描画要素として直接特定する。
 */
async function visualStyle(
	canvas: CanvasDriver,
	prop: "stroke" | "stroke-dasharray",
): Promise<string> {
	const visual = canvas.page.locator("polyline:not([data-kind])").first();
	return visual.evaluate(
		(el, p) => getComputedStyle(el).getPropertyValue(p),
		prop,
	);
}

/** すべての描画用ポリライン（data-kind なし）の指定プロパティ computed style 一覧 */
async function allVisualStyles(
	canvas: CanvasDriver,
	prop: "stroke" | "stroke-dasharray",
): Promise<string[]> {
	return canvas.page.evaluate(
		(p) =>
			[...document.querySelectorAll("polyline:not([data-kind])")].map((el) =>
				getComputedStyle(el).getPropertyValue(p),
			),
		prop,
	);
}

test.describe("コネクターのスタイル", () => {
	test("線色を設定すると描画要素に反映され、選択解除後も保持される", async ({
		canvas,
	}) => {
		await buildConnector(canvas);

		// 線上をクリックして選択（コネクター用 ObjectMenu が出る）
		await canvas.page.mouse.click(500, 350);
		await expect(
			canvas.page.locator('[data-id="object-menu:toggle:line-color"]'),
		).toBeVisible();

		const customStroke = await canvas.normalizeColor("#e11d48");
		await canvas.setColor("line-color", "#e11d48");
		await expect
			.poll(() => visualStyle(canvas, "stroke"), {
				message: "描画用ポリラインに線色が乗ること",
			})
			.toBe(customStroke);

		// 選択を外しても色は残る
		await canvas.deselect();
		expect(await visualStyle(canvas, "stroke")).toBe(customStroke);
	});

	test("線種を破線にすると描画要素の dasharray が設定される", async ({
		canvas,
	}) => {
		await buildConnector(canvas);

		await canvas.page.mouse.click(500, 350);
		await expect(
			canvas.page.locator('[data-id="object-menu:toggle:line-style"]'),
		).toBeVisible();

		// 既定はソリッド（dasharray なし）
		expect(await visualStyle(canvas, "stroke-dasharray")).toBe("none");

		await canvas.setStrokeDashType("line-style", "dashed");
		await expect
			.poll(() => visualStyle(canvas, "stroke-dasharray"), {
				message: "破線化で dasharray が設定されること",
			})
			.not.toBe("none");
	});

	test("線色はコピー＆ペーストで複製コネクターにも引き継がれる", async ({
		canvas,
	}) => {
		await buildConnector(canvas);

		// コネクターを選択して線色を設定する。
		await canvas.page.mouse.click(500, 350);
		await expect(
			canvas.page.locator('[data-id="object-menu:toggle:line-color"]'),
		).toBeVisible();
		const customStroke = await canvas.normalizeColor("#e11d48");
		await canvas.setColor("line-color", "#e11d48");
		await expect.poll(() => visualStyle(canvas, "stroke")).toBe(customStroke);
		await canvas.deselect();

		// 全選択してコピー＆ペースト → コネクターが 2 本になる。
		await canvas.selectAll();
		await canvas.copy();
		await canvas.paste();
		await expect
			.poll(
				async () =>
					(await canvas.captureObjects()).filter((o) => o.tag === "polyline")
						.length,
				{ message: "コピペでコネクターが 2 本になること" },
			)
			.toBe(2);

		// 選択を外す（選択中コネクターのハイライト用ポリラインを描画から消す）。
		await canvas.deselect();

		// 設定した線色を持つ描画用ポリラインがちょうど 2 本（元＋複製）あること。
		// 画面上には UI の装飾ポリライン（別色）も存在するため、全数ではなく
		// 「設定色に一致する本数」で数える。クローンがスタイルを落とすと 1 本になり落ちる。
		const strokes = await allVisualStyles(canvas, "stroke");
		const styledCount = strokes.filter((s) => s === customStroke).length;
		expect(styledCount).toBe(2);
	});
});
