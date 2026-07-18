import { test, expect } from "../../fixtures";
import { selectors } from "../../support/selectors";

/**
 * コマンドレジストリに宣言された「代替キーバインド」の非回帰。
 *
 * 主バインドは既存 spec が守るが、同じコマンドに別名で割り当てられた以下の
 * バインドは未カバーだった（ショートカット表の破損を検知できない）。
 * - Redo: 主 Ctrl+Shift+Z（nudge.spec 等）／ 代替 Ctrl+Y（RedoCommand）
 * - Delete: 主 Delete（selection.spec）／ 代替 Backspace（DeleteCommand）
 * - DeselectAll: 主 Escape（selection.spec）／ 代替 Ctrl+Shift+A（DeselectAllCommand）
 */
test.describe("キーボード: 代替バインド", () => {
	test("Ctrl+Y で redo できる（Ctrl+Shift+Z の代替）", async ({ canvas }) => {
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 200 },
			{ x: 600, y: 320 },
		);
		// 中心は (500, 260)
		expect(await canvas.objectById(id).getAttribute("transform")).toBe(
			"matrix(1, 0, 0, 1, 500, 260)",
		);

		await canvas.nudge("right");
		await expect
			.poll(() => canvas.objectById(id).getAttribute("transform"))
			.toBe("matrix(1, 0, 0, 1, 501, 260)");

		await canvas.undo();
		await expect
			.poll(() => canvas.objectById(id).getAttribute("transform"))
			.toBe("matrix(1, 0, 0, 1, 500, 260)");

		// Ctrl+Y でナッジが再適用される
		await canvas.page.keyboard.press("Control+y");
		await expect
			.poll(() => canvas.objectById(id).getAttribute("transform"), {
				message: "Ctrl+Y で redo が効くこと",
			})
			.toBe("matrix(1, 0, 0, 1, 501, 260)");
	});

	test("Backspace で選択を削除できる（Delete の代替）", async ({ canvas }) => {
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 200 },
			{ x: 600, y: 320 },
		);
		const transform = await canvas.objectById(id).getAttribute("transform");

		await canvas.page.keyboard.press("Backspace");
		await expect
			.poll(async () => (await canvas.captureObjects()).length, {
				message: "Backspace で選択図形が削除されること",
			})
			.toBe(0);

		// 同じ図形が undo で戻る（削除が履歴に積まれている）
		await canvas.undo();
		await expect
			.poll(async () => (await canvas.captureObjects()).length)
			.toBe(1);
		expect(await canvas.objectById(id).getAttribute("transform")).toBe(
			transform,
		);
	});

	test("Ctrl+Shift+A で選択を解除できる（Escape の代替）", async ({
		canvas,
	}) => {
		await canvas.drawShape("Rectangle", { x: 300, y: 200 }, { x: 440, y: 320 });
		await canvas.deselect();
		await canvas.drawShape("Rectangle", { x: 560, y: 200 }, { x: 700, y: 320 });

		await canvas.selectAll();
		expect(await canvas.hasAnyControl()).toBe(true);

		await canvas.page.keyboard.press("Control+Shift+a");
		await expect
			.poll(() => canvas.hasAnyControl(), {
				message: "Ctrl+Shift+A で選択が解除されること",
			})
			.toBe(false);
		await expect(canvas.page.locator(selectors.control)).toHaveCount(0);
	});
});
