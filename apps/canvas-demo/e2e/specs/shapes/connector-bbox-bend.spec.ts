import { test, expect } from "../../fixtures";

/**
 * 直交コネクターの bounding box に「曲がり点（waypoint）」が含まれることを、
 * Zoom to Fit のフレーミングで検証する spec（fix #77 の回帰ガード）。
 *
 * calcConnectorBoundingBox はかつて端点と手動 points だけで範囲を取り、直交ルーティングが
 * 描画時に算出する曲がり点を無視していた。その結果、回り込むコネクターは Zoom to Fit で
 * 折れ部分が画面外に見切れていた。この fix はユニットテスト（calcConnectorBoundingBox.test）で
 * 守られているが、Zoom to Fit が実際に折れ点まで枠に収める——という UI レベルの不変条件は
 * 未検証だった。
 *
 * ここでは、端点の x スパンより外側へ張り出す U ターン経路を作り、Zoom to Fit 後に
 * すべての描画 points（曲がり点を含む）が viewBox 内に収まることを守る。bbox が曲がり点を
 * 落とすと、その点が viewBox の外（見切れ）になり落ちる。
 */

type Vec = { x: number; y: number };
type ViewBox = { minX: number; minY: number; width: number; height: number };

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

function parseViewBox(raw: string | null): ViewBox {
	if (!raw) {
		throw new Error("viewBox が取得できない");
	}
	const [minX, minY, width, height] = raw.trim().split(/\s+/).map(Number);
	return { minX, minY, width, height };
}

test.describe("コネクターの bounding box（曲がり点を含む）", () => {
	test("回り込む直交コネクターの折れ点まで Zoom to Fit が枠に収める", async ({
		canvas,
	}) => {
		// 横長・低背の配置にして Zoom to Fit の制約軸を横にする（縦に余白が出て、
		// 横は内容ぴったり + 余白になるため、横方向の見切れを検出しやすい）。
		// source を右、target を左に置き、source の rightCenter から出すと右へ退出してから
		// U ターンして左の target へ回り込む。右へ張り出す折れ点が端点スパンの外側に来る。
		await canvas.drawShape("Rectangle", { x: 520, y: 360 }, { x: 640, y: 440 });
		await canvas.deselect();
		await canvas.drawShape("Rectangle", { x: 260, y: 360 }, { x: 380, y: 440 });
		await canvas.deselect();

		// source の rightCenter から左の target 右辺中央 (380,400) へドロップして回り込みを作る。
		// 辺アンカー同士なので既定 orthogonal（中心へ落とすと center → 既定 straight で折れなくなる）。
		await canvas.selectAt({ x: 580, y: 400 });
		const connectorId = await canvas.createConnector("rightCenter", {
			x: 380,
			y: 400,
		});
		await canvas.deselect();

		const points = parsePoints(
			await canvas.objectById(connectorId).getAttribute("points"),
		);

		// 前提: U ターンで折れ点が端点の x スパンより右へ張り出している
		// （bbox が曲がり点を無視すると見切れる構図であることをテスト自身で保証する）。
		const endpointMaxX = Math.max(points[0].x, points[points.length - 1].x);
		const routeMaxX = Math.max(...points.map((p) => p.x));
		expect(
			routeMaxX,
			`折れ点が端点スパンの外へ張り出すこと: endpointMaxX=${endpointMaxX} routeMaxX=${routeMaxX}`,
		).toBeGreaterThan(endpointMaxX + 1);

		const before = await canvas.getViewBox();
		await canvas.zoomToFit();
		await expect
			.poll(() => canvas.getViewBox(), {
				message: "Zoom to Fit で viewBox が変化すること",
			})
			.not.toBe(before);

		const vb = parseViewBox(await canvas.getViewBox());

		// Zoom to Fit 後、すべての描画 points（曲がり点を含む）が viewBox 内に収まる。
		// 端点だけで bbox を取ると右の張り出し点が viewBox の右外になり、ここで落ちる。
		const TOL = 1; // 丸め誤差
		for (const [i, p] of points.entries()) {
			expect(
				p.x >= vb.minX - TOL && p.x <= vb.minX + vb.width + TOL,
				`点 ${i} ${JSON.stringify(p)} が viewBox 横範囲 [${vb.minX}, ${vb.minX + vb.width}] に収まること`,
			).toBe(true);
			expect(
				p.y >= vb.minY - TOL && p.y <= vb.minY + vb.height + TOL,
				`点 ${i} ${JSON.stringify(p)} が viewBox 縦範囲 [${vb.minY}, ${vb.minY + vb.height}] に収まること`,
			).toBe(true);
		}
	});
});
