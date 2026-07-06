import { test, expect } from "../../fixtures";

/**
 * ツールバーのズームボタン（gesture 経路: kind=menu / id=toolbar / part=command:*）の e2e。
 *
 * 同一ボタンの素早い2連打は、レコグナイザの排他仕様により2打目が doubleClick に
 * なるが、ToolbarHandler が click / doubleClick を等価に扱うため「N 打＝N 回実行」
 * が成り立つ（docs/04-gesture-system.md「反復ボタン」）。その回帰を検出する。
 */

const zoomInButton = '[data-id="toolbar"][data-part="command:zoomIn"]';
const zoomOutButton = '[data-id="toolbar"][data-part="command:zoomOut"]';
const readout = '[data-id="toolbar"][data-part="command:resetZoom"]';

test.describe("ツールバーのズームボタン", () => {
	test("クリックで1段階ズームし、リセットで 100% に戻る", async ({
		canvas,
	}) => {
		// ズームストップは 1 → 1.25（constants/zoom.ts の ZOOM_STOPS）。
		await canvas.page.click(zoomInButton);
		await expect(canvas.page.locator(readout)).toHaveText("125%");

		await canvas.page.click(zoomOutButton);
		await expect(canvas.page.locator(readout)).toHaveText("100%");

		await canvas.page.click(zoomInButton);
		await canvas.page.click(readout);
		await expect(canvas.page.locator(readout)).toHaveText("100%");
	});

	test("同一ボタンの素早い2連打で2段階ズームする（2打目の doubleClick も実行される）", async ({
		canvas,
	}) => {
		const button = canvas.page.locator(zoomInButton);
		const box = await button.boundingBox();
		if (!box) {
			throw new Error("ズームボタンの位置が取得できない");
		}

		// 座標を先に取り、待ちを挟まず同一点を2連クリック。300ms 以内なら
		// 2打目は doubleClick になる（超えた場合も2クリックなのでどちらでも
		// 2回実行が期待値になり、タイミングに依存しない）。
		const cx = box.x + box.width / 2;
		const cy = box.y + box.height / 2;
		await canvas.page.mouse.click(cx, cy);
		await canvas.page.mouse.click(cx, cy);

		// 1 → 1.25 → 1.5 の2段階（2打目が落ちると 125% のまま）。
		await expect(canvas.page.locator(readout)).toHaveText("150%");
	});
});
