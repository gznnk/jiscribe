import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * コネクター端点の再接続「ドラッグ中（コミット前）のライブプレビュー」を検証する spec。
 *
 * 端点編集ハンドルをドラッグしている最中、コネクターはリリース前からカーソルに追従して
 * リアルタイムに引き直される（handleDrag が実体を直接更新する）。connector-reconnect.spec は
 * リリース後のコミット結果と undo を守るが、ドラッグ中の途中状態（プレビュー）は未検証だった。
 * プレビューが出ないと「離すまで線がどこへ繋がるか分からない」操作になる。
 *
 * dragInspecting でドラッグを保持したまま、コネクターの終点が現在のカーソル位置へ追従して
 * いることを確認し、リリース後にその位置で確定することも併せて守る。zoom=1 では
 * ワールド座標＝コンテンツ座標。
 */

type Vec = { x: number; y: number };

const EPS = 3;

function parsePoints(attr: string | null): Vec[] {
	if (!attr) {
		throw new Error("points 属性が取得できない");
	}
	return attr
		.trim()
		.split(/\s+/)
		.map((pair) => {
			const [x, y] = pair.split(",").map(Number);
			return { x, y };
		});
}

function distance(a: Vec, b: Vec): number {
	return Math.hypot(a.x - b.x, a.y - b.y);
}

async function lastPoint(canvas: CanvasDriver, id: string): Promise<Vec> {
	const points = parsePoints(
		await canvas.objectById(id).getAttribute("points"),
	);
	return points[points.length - 1];
}

test.describe("コネクター再接続のライブプレビュー", () => {
	test("端点ハンドルのドラッグ中に終点がカーソルへ追従し、離すとそこで確定する", async ({
		canvas,
	}) => {
		// 上下 2 矩形を縦コネクターで結ぶ（target は topCenter）。
		await canvas.drawShape("Rectangle", { x: 400, y: 150 }, { x: 600, y: 250 });
		await canvas.deselect();
		await canvas.drawShape("Rectangle", { x: 400, y: 450 }, { x: 600, y: 550 });
		await canvas.deselect();

		await canvas.selectAt({ x: 500, y: 200 });
		const connectorId = await canvas.createConnector("bottomCenter", {
			x: 500,
			y: 455,
		});
		await canvas.deselect();

		const initialLast = await lastPoint(canvas, connectorId);

		// コネクターを選択して target 端点ハンドルを出す。
		await canvas.clickAt({ x: 500, y: 350 });
		const handle = canvas.page.locator(
			`[data-id="${connectorId}"][data-part="endpoint:target"]`,
		);
		await expect(handle).toBeVisible();
		const box = await handle.boundingBox();
		if (!box) {
			throw new Error("target ハンドルの位置が取得できない");
		}
		const fromContent = canvas.toContent({
			x: box.x + box.width / 2,
			y: box.y + box.height / 2,
		});

		// 空きスペースへ向けてハンドルをドラッグし、保持したまま追従を確認する。
		const dragTo = { x: 850, y: 300 };
		await canvas.dragInspecting(fromContent, dragTo, async () => {
			// コミット前でも終点がカーソル位置へ追従している（ライブプレビュー）。
			await expect
				.poll(
					async () => distance(await lastPoint(canvas, connectorId), dragTo),
					{
						message: "ドラッグ中に終点がカーソルへ追従すること",
					},
				)
				.toBeLessThanOrEqual(EPS);
			// 初期位置から確かに動いている。
			expect(
				distance(await lastPoint(canvas, connectorId), initialLast),
			).toBeGreaterThan(50);
		});

		// リリース後、終点はドラッグ先（空きスペース＝free 端点）で確定する。
		await canvas.deselect();
		expect(
			distance(await lastPoint(canvas, connectorId), dragTo),
			"リリース後に終点がドラッグ先で確定すること",
		).toBeLessThanOrEqual(EPS);
	});
});
