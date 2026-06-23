import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * 接続図形を削除したときのコネクター整合性。
 *
 * 既存の connector.spec はコネクター自身の Delete を守るが、「接続先の図形を消したら
 * コネクターはどうなるか」という整合性（cleanupConnectorsOnDelete）は e2e で守られて
 * いなかった。ここが壊れると孤立コネクターが残る・座標解決に失敗してクラッシュする等、
 * ドキュメント破損につながるため ROI が高い。挙動の契約は：
 *
 * - 片端の図形だけ削除 → 削除側を Free 化してコネクターは残す（残った図形に追従し続ける）
 * - 両端の図形を削除 → コネクターも一緒に消える
 * - 削除は1コマンド（cleanup 込み）なので 1 回の undo で図形もコネクターも戻る
 *
 * 観測可能な不変条件（オブジェクト数・polyline の有無・points の追従）で検証する。
 */

const CONNECTOR = "polyline[data-kind=connector]";

/** 上下に並ぶ 2 つの矩形を縦コネクターで結ぶ。各 data-id を返す */
async function buildConnectedPair(canvas: CanvasDriver) {
	const topId = await canvas.drawShape(
		"Rectangle",
		{ x: 400, y: 150 },
		{ x: 600, y: 250 },
	);
	await canvas.deselect();
	const bottomId = await canvas.drawShape(
		"Rectangle",
		{ x: 400, y: 450 },
		{ x: 600, y: 550 },
	);
	await canvas.deselect();

	// 上の矩形を選択し、下辺アンカーから下の矩形の上辺中点へドラッグして接続
	await canvas.selectAt({ x: 500, y: 200 });
	const connectorId = await canvas.createConnector("bottomCenter", {
		x: 500,
		y: 450,
	});
	await canvas.deselect();

	// 矩形 2 + コネクター 1 = 3 オブジェクト
	await expect.poll(async () => (await canvas.captureObjects()).length).toBe(3);

	return { topId, bottomId, connectorId };
}

test.describe("接続図形の削除とコネクター整合性", () => {
	test("片端の図形だけ削除するとコネクターは残り、残った図形に追従する", async ({
		canvas,
	}) => {
		const { topId, bottomId, connectorId } = await buildConnectedPair(canvas);

		// 上の矩形だけ削除（接続元側）
		await canvas.selectAt({ x: 500, y: 200 });
		await canvas.deleteSelection();

		// 上の矩形は消えるが、下の矩形とコネクターは残る（削除側は Free 化）
		await expect
			.poll(async () => (await canvas.captureObjects()).length, {
				message: "矩形 1 とコネクター 1 が残ること",
			})
			.toBe(2);
		await expect(canvas.page.locator(CONNECTOR)).toHaveCount(1);
		await expect(canvas.objectById(topId)).toHaveCount(0);
		await expect(canvas.objectById(bottomId)).toBeVisible();

		// 残った下の矩形を動かすと、接続が生きているコネクターは追従する
		const pointsBefore = await canvas
			.objectById(connectorId)
			.getAttribute("points");
		await canvas.drag({ x: 500, y: 500 }, { x: 800, y: 500 });
		await expect
			.poll(() => canvas.objectById(connectorId).getAttribute("points"), {
				message: "残った図形の移動にコネクターが追従すること",
			})
			.not.toBe(pointsBefore);
	});

	test("両端の図形を削除するとコネクターも消え、undo で 3 つとも戻る", async ({
		canvas,
	}) => {
		await buildConnectedPair(canvas);

		// 2 つの矩形をまとめて選択（コネクター自身は選択しない）
		await canvas.selectAt({ x: 500, y: 200 });
		await canvas.ctrlClickAt({ x: 500, y: 500 });
		await canvas.deleteSelection();

		// 両端が消えるとコネクターも cleanup される → 空になる
		await expect
			.poll(async () => (await canvas.captureObjects()).length, {
				message: "矩形もコネクターも消えること",
			})
			.toBe(0);
		await expect(canvas.page.locator(CONNECTOR)).toHaveCount(0);

		// 削除は cleanup 込みで 1 コマンド。1 回の undo で 3 つとも戻る
		await canvas.undo();
		await expect
			.poll(async () => (await canvas.captureObjects()).length, {
				message: "undo で矩形 2 + コネクター 1 が復元されること",
			})
			.toBe(3);
		await expect(canvas.page.locator(CONNECTOR)).toHaveCount(1);
	});
});
