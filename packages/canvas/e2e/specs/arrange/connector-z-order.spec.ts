import { test, expect } from "../../fixtures";

/**
 * コネクター選択時にも ObjectMenu の StackOrder（重なり順）が出て、
 * 最背面 / 最前面へ移動できることを実操作で検証する。
 *
 * SVG では DOM 順が描画順（後ろの要素ほど前面）。captureObjects() は図形とコネクターを
 * DOM 順で返すので、その中でのコネクターと矩形の相対位置で z-order を確認する。
 * （objectIndex() は [data-kind=object] のみでコネクターを含まないため使わない）
 */
test.describe("コネクターの重なり順（StackOrder メニュー）", () => {
	test("コネクター選択で StackOrder が出て、最背面/最前面へ移動できる", async ({
		canvas,
	}) => {
		const rectA = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 150 },
			{ x: 600, y: 250 },
		);
		await canvas.deselect();
		const rectB = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 450 },
			{ x: 600, y: 550 },
		);
		await canvas.deselect();

		// 上の矩形の bottomCenter から下の矩形へコネクターを作成
		await canvas.selectAt({ x: 500, y: 200 });
		const connectorId = await canvas.createConnector("bottomCenter", {
			x: 500,
			y: 450,
		});
		await canvas.deselect();

		// zOrderIndex は図形 + コネクターを含む DOM 順（背面=小, 前面=大）

		// 新規コネクターは最前面（両矩形より後ろ＝上）
		await expect
			.poll(
				async () =>
					(await canvas.zOrderIndex(connectorId)) >
					(await canvas.zOrderIndex(rectB)),
			)
			.toBe(true);

		// 線上クリックでコネクターを選択
		await canvas.selectAt({ x: 500, y: 350 });

		// 修正点: コネクター選択でも StackOrder セクションが表示される
		await expect(
			canvas.page.locator('[data-part="toggle:stack-order"]'),
		).toBeVisible();

		// 最背面へ → 両矩形より前（上）にいた状態から、両矩形より後ろ（下）へ
		await canvas.arrange("sendToBack");
		await expect
			.poll(
				async () =>
					(await canvas.zOrderIndex(connectorId)) <
					(await canvas.zOrderIndex(rectA)),
			)
			.toBe(true);

		// 一度選択し直してメニュー状態をリセット（arrange はトグルで開くため、
		// 連続呼び出しだと 2 回目のトグルで閉じてしまう）。
		await canvas.deselect();
		await canvas.selectAt({ x: 500, y: 350 });

		// 最前面へ → 再び両矩形より前（上）へ
		await canvas.arrange("bringToFront");
		await expect
			.poll(
				async () =>
					(await canvas.zOrderIndex(connectorId)) >
					(await canvas.zOrderIndex(rectB)),
			)
			.toBe(true);
	});
});
