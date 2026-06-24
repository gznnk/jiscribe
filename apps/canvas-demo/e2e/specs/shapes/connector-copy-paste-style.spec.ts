import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";
import { selectors } from "../../support/selectors";

/**
 * コネクターのスタイル（矢印・線色）がコピー＆ペーストで引き継がれることを守る。
 *
 * 既存の connector-copy-paste は端点リマップ（接続の追従）は見るが、矢印や線色といった
 * スタイルがクリップボード経由で保たれるかは未カバーだった。もしシリアライズから漏れていれば
 * 複製コネクターは既定（始端なし・既定色）に戻る。複製側の矢印数と矢印の塗り色で守る
 * （矢印の塗り = コネクターの stroke 色なので、線色の引き継ぎも同時に検証できる）。
 */

/** data-kind=connector の polyline（本体）の id 一覧 */
async function connectorIds(canvas: CanvasDriver): Promise<string[]> {
	return canvas.page.evaluate(
		(sel) =>
			[...document.querySelectorAll(sel)]
				.map((el) => el.getAttribute("data-id"))
				.filter((id): id is string => id !== null),
		selectors.connectorPolyline,
	);
}

/** コネクター id の矢印 polygon 数 */
async function arrowCount(canvas: CanvasDriver, id: string): Promise<number> {
	return canvas.page.evaluate(
		(cid) =>
			document.querySelectorAll(
				`polygon[data-kind="connector"][data-id="${cid}"]`,
			).length,
		id,
	);
}

/** コネクター id の最初の矢印 polygon の computed fill */
async function arrowFill(canvas: CanvasDriver, id: string): Promise<string> {
	return canvas.page.evaluate((cid) => {
		const arrow = document.querySelector(
			`polygon[data-kind="connector"][data-id="${cid}"]`,
		);
		return arrow ? getComputedStyle(arrow).fill : "";
	}, id);
}

test("コピー＆ペーストはコネクターの矢印（startArrow）と線色を引き継ぐ", async ({
	canvas,
}) => {
	// 上下 2 矩形を縦コネクターで接続。
	await canvas.drawShape("Rectangle", { x: 400, y: 150 }, { x: 600, y: 250 });
	await canvas.deselect();
	await canvas.drawShape("Rectangle", { x: 400, y: 400 }, { x: 600, y: 500 });
	await canvas.deselect();
	await canvas.selectAt({ x: 500, y: 200 });
	const srcConnectorId = await canvas.createConnector("bottomCenter", {
		x: 500,
		y: 400,
	});
	await canvas.deselect();

	// コネクターを選択して、既定にない始端矢印と線色を設定する。
	await canvas.clickAt({ x: 500, y: 325 });
	await expect(
		canvas.page.locator(selectors.objectMenuToggle("arrow-head-start")),
	).toBeVisible();
	await canvas.openObjectMenu("arrow-head-start");
	await canvas.page.click(
		selectors.objectMenuSet("startArrow", "FilledTriangle"),
	);
	await canvas.setColor("line-color", "#e11d48");

	// 始端＋終端で矢印 2 つになっていること（設定が乗った確認）。
	await expect.poll(() => arrowCount(canvas, srcConnectorId)).toBe(2);
	const expectedFill = await canvas.normalizeColor("#e11d48");

	// 色入力欄にフォーカスが残ったままだと Ctrl+A/C/V が入力欄に吸われるため、
	// 一度選択解除してメニューを閉じ、フォーカスをキャンバスへ戻してから全選択する。
	await canvas.deselect();

	// 全選択してコピー＆ペースト。
	await canvas.selectAll();
	await canvas.copy();
	await canvas.paste();
	await expect.poll(async () => (await connectorIds(canvas)).length).toBe(2);

	const clonedConnectorId = (await connectorIds(canvas)).find(
		(id) => id !== srcConnectorId,
	);
	if (!clonedConnectorId) {
		throw new Error("複製されたコネクターの data-id が取得できない");
	}

	// 複製コネクターも始端矢印を保持（2 つ）し、線色（＝矢印塗り）も引き継ぐ。
	expect(await arrowCount(canvas, clonedConnectorId)).toBe(2);
	expect(await arrowFill(canvas, clonedConnectorId)).toBe(expectedFill);
});
