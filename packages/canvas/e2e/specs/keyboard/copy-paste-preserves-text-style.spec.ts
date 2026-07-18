import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";
import { selectors } from "../../support/selectors";

/**
 * コピー＆ペースト／複製がテキストスタイル（フォントサイズ・文字色・太字）を引き継ぐことを守る。
 *
 * 既存の preserves-content 系は背景色とテキスト内容は見るが、フォント系の TextStyle プロパティ
 * （fontSize / fontColor / fontWeight）がクリップボードのシリアライズで保たれるかは未カバーだった。
 * 複製された図形の描画結果（computed style）で照合する。
 */

const FONT_SIZE = 40;
const FONT_COLOR = "#e11d48";

/** rect を描いてテキストを入れ、フォントサイズ・文字色・太字を設定して id を返す（選択維持） */
async function drawStyledRect(canvas: CanvasDriver): Promise<string> {
	const id = await canvas.drawShape(
		"Rectangle",
		{ x: 360, y: 180 },
		{ x: 600, y: 340 },
	);
	await canvas.typeTextAt({ x: 480, y: 260 }, "Styled");
	await canvas.commitText();
	await canvas.selectAt({ x: 480, y: 260 });

	await canvas.openObjectMenu("font-size");
	await canvas.setNumberInput("fontSize", FONT_SIZE);
	await canvas.setColor("font-color", FONT_COLOR);
	await canvas.page.click(selectors.objectMenuSet("fontWeight", "bold"));

	// 設定が描画へ乗りきるまで待つ。
	await expect
		.poll(async () => (await canvas.textStyleOf(id))?.fontWeight)
		.toBe("700");
	return id;
}

/** 直近で増えた図形（コピー/複製先）の data-id を返す */
async function newObjectId(
	canvas: CanvasDriver,
	beforeIds: Set<string | null>,
): Promise<string> {
	const after = await canvas.captureObjects();
	const created = after.find((obj) => !beforeIds.has(obj.id));
	if (!created?.id) {
		throw new Error("増えた図形の data-id が取得できない");
	}
	return created.id;
}

test.describe("コピー＆ペースト／複製のテキストスタイル保持", () => {
	test("コピー＆ペーストは fontSize / fontColor / fontWeight を引き継ぐ", async ({
		canvas,
	}) => {
		const srcId = await drawStyledRect(canvas);
		const expectedColor = await canvas.normalizeColor(FONT_COLOR);

		const before = await canvas.captureObjects();
		const beforeIds = new Set(before.map((obj) => obj.id));

		await canvas.copy();
		await canvas.paste();
		await expect
			.poll(async () => (await canvas.captureObjects()).length)
			.toBe(before.length + 1);

		const pastedId = await newObjectId(canvas, beforeIds);
		const pastedStyle = await canvas.textStyleOf(pastedId);
		expect(pastedStyle?.fontSize).toBe(`${FONT_SIZE}px`);
		expect(pastedStyle?.color).toBe(expectedColor);
		expect(pastedStyle?.fontWeight).toBe("700");

		// 元図形のスタイルも維持される。
		const srcStyle = await canvas.textStyleOf(srcId);
		expect(srcStyle?.fontSize).toBe(`${FONT_SIZE}px`);
		expect(srcStyle?.fontWeight).toBe("700");
	});

	test("複製（Ctrl+D）は fontSize / fontColor / fontWeight を引き継ぐ", async ({
		canvas,
	}) => {
		await drawStyledRect(canvas);
		const expectedColor = await canvas.normalizeColor(FONT_COLOR);

		const before = await canvas.captureObjects();
		const beforeIds = new Set(before.map((obj) => obj.id));

		await canvas.duplicate();
		await expect
			.poll(async () => (await canvas.captureObjects()).length)
			.toBe(before.length + 1);

		const clonedId = await newObjectId(canvas, beforeIds);
		const clonedStyle = await canvas.textStyleOf(clonedId);
		expect(clonedStyle?.fontSize).toBe(`${FONT_SIZE}px`);
		expect(clonedStyle?.color).toBe(expectedColor);
		expect(clonedStyle?.fontWeight).toBe("700");
	});
});
