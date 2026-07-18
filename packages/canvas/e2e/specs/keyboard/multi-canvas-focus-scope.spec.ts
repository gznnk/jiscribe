import { test, expect } from "../../fixtures";

/**
 * 複数 Canvas のキーボードスコープ（issue #24）。
 * ショートカットの keydown リスナーは document ではなくフォーカス可能な
 * CanvasRoot にスコープされているため、同一ページに複数の Canvas があっても
 * フォーカスのある Canvas だけがショートカットを処理する。
 * ?multi は 2 つの Canvas（rect-a / rect-b を 1 つずつ持つ）を並べた検証ページ。
 */
test.describe("キーボード: 複数 Canvas のスコープ", () => {
	test("ショートカットはフォーカスのある Canvas だけが処理する", async ({
		page,
	}) => {
		await page.goto("/?multi");
		const canvasA = page.getByTestId("canvas-a");
		const canvasB = page.getByTestId("canvas-b");
		// 1 図形は同一 data-id の要素を複数描画する（本体・ヒットエリア等）ため、
		// 存在判定は first() / count 0 で行う
		const rectA = canvasA.locator('[data-id="rect-a"]');
		const rectB = canvasB.locator('[data-id="rect-b"]');
		await expect(rectA.first()).toBeVisible();
		await expect(rectB.first()).toBeVisible();

		// 両キャンバスで図形を選択する（選択状態は Canvas ごとに独立して保持される）
		await rectA.first().click();
		await expect(canvasA.locator("[data-kind=control]").first()).toBeVisible();
		await rectB.first().click();
		await expect(canvasB.locator("[data-kind=control]").first()).toBeVisible();

		// Delete は最後にクリックした（＝フォーカスのある）B だけで実行される。
		// document リスナーだった旧実装では両 Canvas が反応し rect-a も消えていた。
		await page.keyboard.press("Delete");
		await expect(rectB).toHaveCount(0);
		await expect(rectA.first()).toBeVisible();
	});
});
