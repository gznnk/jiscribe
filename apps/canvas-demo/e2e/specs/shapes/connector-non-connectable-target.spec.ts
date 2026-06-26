import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * 接続できない図形（connectable=false）の上へドロップしても結線されないことを検証する spec。
 *
 * コネクター端点のドロップ先は connectable な型だけが対象になる
 * （findConnectableHoverTarget が features.connectable で絞る）。rect/ellipse/sticky は
 * connectable だが、polyline/polygon/group/connector は connectable=false。既存 spec は
 * connectable な接続先ばかりで、この「非 connectable 図形には吸着せず free になる」フィルタは
 * 未検証だった。
 *
 * 判別のため Polyline の *中心から外れた* 点へドロップする:
 *   - 正しく free のままなら端点はドロップ座標に止まる
 *   - もし誤って接続されると端点は Polyline の中心（最近接アンカー）へ吸着してしまう
 * この差で connectable フィルタが効いていることを守る。content→world は source 図形の
 * 描画座標と実 AABB から逆算する（zoom=1）。
 */

type Vec = { x: number; y: number };
type AABB = { minX: number; minY: number; maxX: number; maxY: number };

const EPS = 2;

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

async function worldAABB(canvas: CanvasDriver, id: string): Promise<AABB> {
	return canvas.page.evaluate((targetId) => {
		const el = document.querySelector(`[data-id="${targetId}"]`);
		if (!(el instanceof SVGGraphicsElement)) {
			throw new Error(`図形 ${targetId} が SVGGraphicsElement でない`);
		}
		const bbox = el.getBBox();
		const ctm = el.getCTM();
		if (!ctm) {
			throw new Error(`図形 ${targetId} の CTM が取得できない`);
		}
		const corners = [
			{ x: bbox.x, y: bbox.y },
			{ x: bbox.x + bbox.width, y: bbox.y },
			{ x: bbox.x, y: bbox.y + bbox.height },
			{ x: bbox.x + bbox.width, y: bbox.y + bbox.height },
		].map((p) => ({
			x: p.x * ctm.a + p.y * ctm.c + ctm.e,
			y: p.x * ctm.b + p.y * ctm.d + ctm.f,
		}));
		const xs = corners.map((corner) => corner.x);
		const ys = corners.map((corner) => corner.y);
		return {
			minX: Math.min(...xs),
			maxX: Math.max(...xs),
			minY: Math.min(...ys),
			maxY: Math.max(...ys),
		};
	}, id);
}

test.describe("非 connectable 図形への非接続", () => {
	test("Polyline の上へドロップしても結線されず free 端点になる", async ({
		canvas,
	}) => {
		// source の content 描画座標（content→world オフセット逆算用）。
		const srcContent = { minX: 150, minY: 300, maxX: 310, maxY: 400 };
		const sourceId = await canvas.drawShape(
			"Rectangle",
			{ x: srcContent.minX, y: srcContent.minY },
			{ x: srcContent.maxX, y: srcContent.maxY },
		);
		await canvas.deselect();

		// 右側に水平な Polyline（connectable=false）を引く。中心は (800,350)。
		await canvas.drawShape("Polyline", { x: 700, y: 350 }, { x: 900, y: 350 });
		await canvas.deselect();

		// rightCenter から Polyline の「中心を外した」点 (860,350) へドロップ。
		const dropContent = { x: 860, y: 350 };
		await canvas.selectAt({ x: 230, y: 350 });
		const connectorId = await canvas.createConnector(
			"rightCenter",
			dropContent,
		);
		await canvas.deselect();

		const points = parsePoints(
			await canvas.objectById(connectorId).getAttribute("points"),
		);
		const sourceBox = await worldAABB(canvas, sourceId);

		// content→world オフセット（zoom=1・パンなしなので平行移動）。
		const offsetX = sourceBox.minX - srcContent.minX;
		const offsetY = sourceBox.minY - srcContent.minY;
		const dropWorld = {
			x: dropContent.x + offsetX,
			y: dropContent.y + offsetY,
		};
		const polylineCenterWorld = { x: 800 + offsetX, y: 350 + offsetY };

		const endpoint = points[points.length - 1];

		// free のままなのでドロップ座標に止まる（Polyline へ吸着していない）。
		expect(
			distance(endpoint, dropWorld),
			`終点 ${JSON.stringify(endpoint)} がドロップ座標 ${JSON.stringify(dropWorld)} に止まること（free）`,
		).toBeLessThanOrEqual(EPS);
		// 誤って接続された場合に来るはずの Polyline 中心とは明確に異なる。
		expect(
			distance(endpoint, polylineCenterWorld),
			"終点が Polyline 中心へ吸着していないこと（connectable フィルタが効いている）",
		).toBeGreaterThan(20);

		// Polyline を動かしても追従しない（＝接続されていない）。コネクター線（〜x860 まで）と
		// 重ならない (880,350) で Polyline を掴んで動かす。
		const before = await canvas.objectById(connectorId).getAttribute("points");
		await canvas.drag({ x: 880, y: 350 }, { x: 880, y: 560 });
		expect(
			await canvas.objectById(connectorId).getAttribute("points"),
			"Polyline 移動でコネクターが追従しないこと",
		).toBe(before);
	});
});
