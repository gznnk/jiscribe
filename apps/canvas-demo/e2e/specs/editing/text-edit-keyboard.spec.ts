import { test, expect } from "../../fixtures";
import { selectors } from "../../support/selectors";

/**
 * Enter キーによるテキスト編集開始（StartTextEditCommand の code: "Enter"）。
 *
 * editing/text-edit.spec はダブルクリック起点の編集を守り、コネクターラベルの
 * Enter 起点は editing/connector-label.spec が守るが、単一選択した「図形」に
 * Enter を送って本文編集を開始する経路は未カバーだった。図形選択中の Enter で
 * text-editor が開き、入力が本文として確定・保持されること、Escape でキャンセル
 * されることを守る。
 */
test.describe("キーボード: Enter でのテキスト編集開始", () => {
	test("図形選択中に Enter で本文編集を開始し、外側クリックで確定される", async ({
		canvas,
	}) => {
		await canvas.drawShape("Rectangle", { x: 400, y: 200 }, { x: 600, y: 320 });
		// 描画直後は選択済み。クリックで選択とキャンバスフォーカスを確実にしてから Enter。
		await canvas.selectAt({ x: 500, y: 260 });

		await canvas.page.keyboard.press("Enter");
		await expect(canvas.page.locator(selectors.textEditor)).toBeVisible();

		await canvas.page.keyboard.type("Typed via Enter");
		await canvas.commitText();

		await expect(canvas.page.locator("body")).toContainText("Typed via Enter");
	});

	test("Enter で開いた編集は Escape でキャンセルされ本文は残らない", async ({
		canvas,
	}) => {
		await canvas.drawShape("Rectangle", { x: 400, y: 200 }, { x: 600, y: 320 });
		await canvas.selectAt({ x: 500, y: 260 });

		await canvas.page.keyboard.press("Enter");
		await expect(canvas.page.locator(selectors.textEditor)).toBeVisible();

		await canvas.page.keyboard.type("Discarded via Escape");
		await canvas.cancelText();

		await expect(canvas.page.locator("body")).not.toContainText(
			"Discarded via Escape",
		);
	});
});
