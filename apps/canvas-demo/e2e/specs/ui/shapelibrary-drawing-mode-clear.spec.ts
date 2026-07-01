import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";
import { selectors, type ToolTitle } from "../../support/selectors";

/**
 * ShapeLibrary の描画モードは、以下の 2 つの操作で解除されることを守る。
 *
 * 1. 描画非対応の図形（Sticky など bounds 描画を持たない図形）を押下したとき。
 *    これらは押下で即配置されるだけで描画モードに入らないため、直前の描画モードが
 *    残ったままになるのを防ぐ（クリックした瞬間に shapeDrawing を null にする）。
 * 2. いずれかの図形で D&D を開始したとき。ドラッグ配置は描画モードとは別経路のため、
 *    dragStart の時点で描画モードをクリアする。
 *
 * 描画モードの ON/OFF は各ツールボタンの cursor で観測する。描画中のプリセットの
 * ボタンだけが cursor: crosshair（isActive）になり、非アクティブは grab に戻る
 * （ShapeLibraryStyled のスタイル契約）。
 */

/** ツールボタンの computed cursor を返す。crosshair=描画モード ON / grab=OFF。 */
async function toolCursor(
	canvas: CanvasDriver,
	tool: ToolTitle,
): Promise<string> {
	return canvas.page
		.locator(selectors.toolButton(tool))
		.evaluate((el) => getComputedStyle(el).cursor);
}

/** ツールボタンの画面中心（boundingBox は画面座標を返す）。 */
async function toolButtonCenter(
	canvas: CanvasDriver,
	tool: ToolTitle,
): Promise<{ x: number; y: number }> {
	const box = await canvas.page
		.locator(selectors.toolButton(tool))
		.boundingBox();
	if (!box) {
		throw new Error(`${tool} ボタンの位置が取得できない`);
	}
	return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** ツールボタンをクリックして描画モードに入る（cursor: crosshair になるまで待つ）。 */
async function enterDrawingMode(canvas: CanvasDriver, tool: ToolTitle) {
	await canvas.page.click(selectors.toolButton(tool));
	await expect
		.poll(() => toolCursor(canvas, tool), {
			message: `${tool} が描画モードになること`,
		})
		.toBe("crosshair");
}

test.describe("ShapeLibrary 描画モードの解除", () => {
	test("描画モード中に描画非対応の図形（Sticky）を押下すると描画モードが解除される", async ({
		canvas,
	}) => {
		// Rectangle で描画モードに入る
		await enterDrawingMode(canvas, "Rectangle");

		// Sticky を押下 → 中央へ即配置され、描画モードは解除されるはず
		const stickyId = await canvas.placeShape("Sticky");
		expect(stickyId).toBeTruthy();

		// Rectangle の描画モードが解除されている（cursor が grab に戻る）
		await expect
			.poll(() => toolCursor(canvas, "Rectangle"), {
				message: "Sticky 押下で Rectangle の描画モードが解除されること",
			})
			.toBe("grab");
	});

	test("描画モード中に図形の D&D を開始すると描画モードが解除される", async ({
		canvas,
	}) => {
		// Rectangle で描画モードに入る
		await enterDrawingMode(canvas, "Rectangle");

		const before = (await canvas.captureObjects()).length;

		// Ellipse ボタンを掴んでキャンバス内部へドラッグ開始する。
		// dragStart の時点で描画モードが解除されることを、解放前に検証する。
		const from = await toolButtonCenter(canvas, "Ellipse");
		// 上端エッジゾーン（自動スクロール誘発）を避けて十分内部へ。横は中央寄り。
		const to = canvas.toScreen({ x: 400, y: 260 });

		await canvas.page.mouse.move(from.x, from.y);
		await canvas.page.mouse.down();
		try {
			await canvas.page.mouse.move(to.x, to.y, { steps: 12 });

			// D&D 開始で描画モードが解除される（Rectangle が crosshair → grab）
			await expect
				.poll(() => toolCursor(canvas, "Rectangle"), {
					message: "D&D 開始で Rectangle の描画モードが解除されること",
				})
				.toBe("grab");
		} finally {
			await canvas.page.mouse.up();
		}

		// D&D 完了で Ellipse が 1 つ配置され、描画モードは解除されたまま
		await expect
			.poll(async () => (await canvas.captureObjects()).length, {
				message: "D&D で新規図形が配置されること",
			})
			.toBe(before + 1);
		expect(await toolCursor(canvas, "Rectangle")).toBe("grab");
	});
});
