import { test, expect } from "../../fixtures";
import { selectors } from "../../support/selectors";

test.describe("ObjectMenu によるスタイル設定", () => {
	test("背景色と枠線色を CSS カラー入力で設定できる", async ({ canvas }) => {
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 200 },
			{ x: 600, y: 320 },
		);

		await canvas.setColor("bg-color", "#6366f1");
		await canvas.setColor("stroke-color", "#4f46e5");

		// 色は SVG 属性ではなく emotion CSS で当たるため computed style で検証する
		expect(await canvas.computedColor(id, "fill")).toBe(
			await canvas.normalizeColor("#6366f1"),
		);
		expect(await canvas.computedColor(id, "stroke")).toBe(
			await canvas.normalizeColor("#4f46e5"),
		);
	});

	test("transparent も設定できる", async ({ canvas }) => {
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 200 },
			{ x: 600, y: 320 },
		);

		await canvas.setColor("stroke-color", "transparent");

		// transparent は computed style で rgba(0, 0, 0, 0) として解決される
		expect(await canvas.computedColor(id, "stroke")).toBe(
			await canvas.normalizeColor("transparent"),
		);
	});

	test("ポリラインを破線にできる", async ({ canvas }) => {
		const id = await canvas.drawShape(
			"Polyline",
			{ x: 400, y: 400 },
			{ x: 700, y: 450 },
		);

		await canvas.setStrokeDashType("line-style", "dashed");

		// スタイルは当たり判定用要素ではなく描画用要素に付く
		await expect(await canvas.visualPolylineFor(id)).toHaveAttribute(
			"stroke-dasharray",
			/.+/,
		);
	});

	test("サブメニューの背景をクリックしても閉じない", async ({ canvas }) => {
		await canvas.drawShape("Rectangle", { x: 400, y: 200 }, { x: 600, y: 320 });

		// カラーピッカーのサブメニューを開く
		await canvas.openObjectMenu("bg-color");
		const colorInput = canvas.page.locator(selectors.cssColorInput);
		await expect(colorInput).toBeVisible();

		// パネルの余白（ボタン以外の背景部分）をクリックする。
		// ColorPickerContainer の padding 領域に当たる左上角を狙う。
		const panel = canvas.page.locator('[data-id="object-menu:panel"]');
		await panel.click({ position: { x: 6, y: 6 } });

		// サブメニューは開いたまま、図形の選択も維持されること
		await expect(colorInput).toBeVisible();
		await expect(canvas.page.locator(selectors.control).first()).toBeVisible();
	});

	test("色設定はテキスト編集後も保持される", async ({ canvas }) => {
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 200 },
			{ x: 600, y: 320 },
		);
		await canvas.setColor("bg-color", "#dbeafe");

		await canvas.deselect();
		await canvas.typeTextAt({ x: 500, y: 260 }, "Styled");
		await canvas.commitText();

		expect(await canvas.computedColor(id, "fill")).toBe(
			await canvas.normalizeColor("#dbeafe"),
		);
		await expect(canvas.page.locator("body")).toContainText("Styled");
	});
});
