import { test, expect } from "../../fixtures";
import { selectors } from "../../support/selectors";

/**
 * Sticky のテキストスタイル設定。
 *
 * Sticky は rect/ellipse と違い `<g data-id>` の子として TextOverlay を持つ別 DOM 構造で、
 * かつ既定テキストを持たない。配置 → テキスト入力 → フォント設定という経路で、
 * fontSize / fontColor / fontWeight が描画へ反映されることを守る。
 */
test.describe("Sticky のテキストスタイル", () => {
	test("フォントサイズ・文字色・太字を設定すると描画に反映される", async ({
		canvas,
	}) => {
		const id = await canvas.placeShape("Sticky");
		// 配置直後の選択メニューがテキスト編集の邪魔をしないよう一度解除する。
		await canvas.deselect();

		// 配置位置（中心）をバウンディングボックスから求めてテキストを入れる。
		const box = await canvas.objectById(id).boundingBox();
		if (!box) {
			throw new Error("Sticky の位置が取得できない");
		}
		const center = canvas.toContent({
			x: box.x + box.width / 2,
			y: box.y + box.height / 2,
		});
		await canvas.typeTextAt(center, "Note");
		await canvas.commitText();
		await canvas.selectAt(center);

		await canvas.openObjectMenu("font-size");
		await canvas.setNumberInput("fontSize", 36);
		await canvas.setColor("font-color", "#0ea5e9");
		await canvas.page.click(selectors.objectMenuSet("fontWeight", "bold"));

		await expect
			.poll(async () => (await canvas.textStyleOf(id))?.fontSize)
			.toBe("36px");
		const style = await canvas.textStyleOf(id);
		expect(style?.color).toBe(await canvas.normalizeColor("#0ea5e9"));
		expect(style?.fontWeight).toBe("700");
	});
});
