import { test, expect } from "../../fixtures";

/**
 * 統一 z-order によりコネクターは図形の背面にも置ける。
 * ヒットテストは SVG の paint 順（= DOM 順）に従うので、背面に送ると
 * 重なっている図形のほうが優先選択されることを実操作で検証する。
 * コネクター選択中かどうかは line-color メニュー（コネクター専用）の有無で判定する。
 */
test.describe("コネクターのヒットテスト（z-order 連動）", () => {
	test("背面に送ると重なる図形が優先選択される", async ({ canvas }) => {
		// 上下に矩形、そして両者を結ぶ縦コネクターの中点（~500,350）を覆う矩形を置く
		await canvas.drawShape("Rectangle", { x: 400, y: 150 }, { x: 600, y: 250 });
		await canvas.deselect();
		await canvas.drawShape("Rectangle", { x: 400, y: 450 }, { x: 600, y: 550 });
		await canvas.deselect();
		await canvas.drawShape("Rectangle", { x: 440, y: 310 }, { x: 560, y: 390 });
		await canvas.deselect();

		// 上の矩形の bottomCenter から下の矩形へコネクターを作成（中点で覆う矩形と重なる）
		await canvas.selectAt({ x: 500, y: 200 });
		await canvas.createConnector("bottomCenter", { x: 500, y: 450 });
		await canvas.deselect();

		const lineColor = canvas.page.locator('[data-part="toggle:line-color"]');

		// 新規コネクターは最前面 → 重なり点クリックでコネクターが選ばれる
		await canvas.selectAt({ x: 500, y: 350 });
		await expect(lineColor).toBeVisible();

		// 背面へ送る
		await canvas.arrange("sendToBack");
		await canvas.deselect();

		// 同じ点をクリック → 覆う矩形が前面なのでコネクターは選ばれない
		await canvas.selectAt({ x: 500, y: 350 });
		await expect(lineColor).toHaveCount(0);
	});
});
