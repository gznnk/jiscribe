import { test, expect } from "../../fixtures";

test.describe("ObjectMenu によるスタイル設定", () => {
	test("背景色と枠線色を CSS カラー入力で設定できる", async ({ canvas }) => {
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 200 },
			{ x: 600, y: 320 },
		);

		await canvas.setColor("bg-color", "#6366f1");
		await canvas.setColor("stroke-color", "#4f46e5");

		const rect = canvas.objectById(id);
		await expect(rect).toHaveAttribute("fill", "#6366f1");
		await expect(rect).toHaveAttribute("stroke", "#4f46e5");
	});

	test("transparent も設定できる", async ({ canvas }) => {
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 200 },
			{ x: 600, y: 320 },
		);

		await canvas.setColor("stroke-color", "transparent");

		await expect(canvas.objectById(id)).toHaveAttribute(
			"stroke",
			"transparent",
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

		await expect(canvas.objectById(id)).toHaveAttribute("fill", "#dbeafe");
		await expect(canvas.page.locator("body")).toContainText("Styled");
	});
});
