import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * コンテキストメニュー（右クリック）からの重なり順コマンドの dispatch を守る。
 *
 * 既存の driver-context-menu は duplicate / copy / paste の dispatch は見るが、
 * bringToFront / sendToBack といった arrange コマンドはコンテキストメニュー経由では未カバーだった。
 * （ObjectMenu の arrange は別途テスト済み。）DOM 順（後ろの要素ほど前面）で結果を守る。
 *
 * 注意: 右クリックは選択を変えず、現在の選択に対してメニューを開く。左クリックの直後に
 * 同じ図形を右クリックすると click レコグナイザが連続クリックとして合体させてしまうため、
 * 対象は「描画直後＝自動選択済み」の状態のまま右クリックする（selectAt を挟まない）。
 */

const TARGET_CENTER = { x: 570, y: 250 };

/** 背面の矩形 → 前面の矩形（自動選択済み）の順に描き、両 id を返す */
async function drawBackThenSelectedFront(
	canvas: CanvasDriver,
): Promise<{ back: string; target: string }> {
	const back = await canvas.drawShape(
		"Rectangle",
		{ x: 350, y: 200 },
		{ x: 450, y: 300 },
	);
	await canvas.deselect();
	// 2 枚目は描画直後で自動選択された状態のまま（= 右クリックの対象）。
	const target = await canvas.drawShape(
		"Rectangle",
		{ x: 520, y: 200 },
		{ x: 620, y: 300 },
	);
	return { back, target };
}

test.describe("コンテキストメニューの重なり順", () => {
	test("右クリック → 最背面へ で選択図形が最背面（DOM 先頭）に移動する", async ({
		canvas,
	}) => {
		const { back, target } = await drawBackThenSelectedFront(canvas);
		// 初期は target（後で描いた方）が前面。
		expect(await canvas.objectIndex(target)).toBeGreaterThan(
			await canvas.objectIndex(back),
		);

		await canvas.openContextMenu(TARGET_CENTER);
		await canvas.clickContextMenuCommand("sendToBack");
		await expect.poll(() => canvas.contextMenuVisible()).toBe(false);

		await expect
			.poll(async () => await canvas.objectIndex(target))
			.toBeLessThan(await canvas.objectIndex(back));
	});

	test("右クリック → 最前面へ で背面に送った図形が再び最前面（DOM 末尾）になる", async ({
		canvas,
	}) => {
		const { back, target } = await drawBackThenSelectedFront(canvas);

		// まず最背面へ送って、bringToFront が意味を持つ状態（前面でない）にする。
		await canvas.openContextMenu(TARGET_CENTER);
		await canvas.clickContextMenuCommand("sendToBack");
		await expect.poll(() => canvas.contextMenuVisible()).toBe(false);
		await expect
			.poll(async () => await canvas.objectIndex(target))
			.toBeLessThan(await canvas.objectIndex(back));

		// 選択は維持されているので、もう一度右クリックして最前面へ。
		await canvas.openContextMenu(TARGET_CENTER);
		await canvas.clickContextMenuCommand("bringToFront");
		await expect.poll(() => canvas.contextMenuVisible()).toBe(false);

		await expect
			.poll(async () => await canvas.objectIndex(target))
			.toBeGreaterThan(await canvas.objectIndex(back));
	});
});
