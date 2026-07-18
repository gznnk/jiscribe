import { test, expect } from "../../fixtures";
import { selectors } from "../../support/selectors";

/**
 * 中ボタン（button 1）のルーティング回帰の e2e 化（#159）。
 *
 * #110 の supports 排他化で中ボタンイベントがどのハンドラにもマッチせず宙に浮き、
 * テキスト編集中の中クリックが確定されない不具合があった。修正で中ボタンは
 * 右ボタン同様 CanvasEventHandler へルーティングされ、
 *   - ドラッグ=パン（図形の上から始めても canvas レベルのパンになる）
 *   - クリック=テキスト編集の確定のみ（自前コンテキストメニューは開かない）
 * という振る舞いになった。仕様は packages/canvas/docs/04-gesture-system.md 参照。
 */
test.describe("中ボタンのルーティング（#159）", () => {
	test("中ドラッグは図形の上から始めてもキャンバスをパンする", async ({
		canvas,
	}) => {
		// 図形の中心から中ドラッグを始める。左ボタンなら移動/選択になる位置。
		await canvas.drawShape("Rectangle", { x: 400, y: 200 }, { x: 600, y: 320 });
		await canvas.deselect();

		const before = await canvas.getViewBox();

		await canvas.middleDrag({ x: 500, y: 260 }, { x: 500, y: 420 });

		// パン＝viewBox が動く（図形の上で始めても canvas レベルの挙動になる）
		await expect
			.poll(() => canvas.getViewBox(), {
				message: "中ドラッグで viewBox がパンすること",
			})
			.not.toBe(before);
		// 図形は選択も移動もされていない（object ハンドラが掴んでいない証拠）
		expect(await canvas.hasAnyControl()).toBe(false);
	});

	test("テキスト編集中に別図形を中クリックすると編集が確定する", async ({
		canvas,
	}) => {
		// 別々の位置に2つの図形を置く
		await canvas.drawShape("Rectangle", { x: 300, y: 200 }, { x: 460, y: 300 });
		await canvas.drawShape("Rectangle", { x: 800, y: 500 }, { x: 960, y: 600 });
		await canvas.deselect();

		const rect1Center = { x: 380, y: 250 };
		const rect2Center = { x: 880, y: 550 };

		// rect1 のテキスト編集を開始して入力（この時点で editor は開いている）
		await canvas.typeTextAt(rect1Center, "Hi");
		await expect(canvas.page.locator(selectors.textEditor)).toBeVisible();

		// rect2 を中クリック → 編集が確定して editor が閉じる（修正前は宙に浮いて開き続けた）
		await canvas.middleClickAt(rect2Center);

		await expect(canvas.page.locator(selectors.textEditor)).toHaveCount(0);

		// 確定した内容が保持されている（再編集で末尾キャレット＝長さ 2）
		await canvas.page.mouse.dblclick(
			canvas.toScreen(rect1Center).x,
			canvas.toScreen(rect1Center).y,
		);
		await expect(canvas.page.locator(selectors.textEditor)).toBeVisible();
		expect(await canvas.textEditorSelection()).toEqual({ start: 2, end: 2 });
		await canvas.cancelText();
	});

	test("中クリックは自前コンテキストメニューを開かない", async ({ canvas }) => {
		// 右クリックはメニューを開くが、中クリックは開かない（右の領分を侵さない）
		await canvas.middleClickAt({ x: 70, y: 820 });

		expect(await canvas.contextMenuVisible()).toBe(false);
	});
});
