import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * 「片側 free 端点」のコネクターを幾何レベルで検証する spec。
 *
 * コネクター端点を図形のない空きスペースへドロップすると、その端点は free アンカー
 * （kind="free", 絶対座標）として確定する。owned 端点（図形の辺）と違い、free 端点は
 *   - 図形に吸着せず、ドロップした座標そのものに止まる（外向きスタブの押し出しもない）
 *   - 接続図形を動かしても追従しない（絶対座標に固定）
 * という挙動を持つ。既存のコネクター spec は両端 owned ばかりで、この free 端点の幾何は
 * 未検証だった。
 *
 * content 座標とワールド座標のマッピングは、source 図形の描画座標と実 AABB から実行時に
 * 逆算する（zoom=1・パンなしなので平行移動のみ）。これにより free 端点＝ドロップ座標を
 * オフセット非依存に突き合わせる。
 */

type Vec = { x: number; y: number };
type AABB = { minX: number; minY: number; maxX: number; maxY: number };

const EPS = 1.5;

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
		const xs = corners.map((c) => c.x);
		const ys = corners.map((c) => c.y);
		return {
			minX: Math.min(...xs),
			maxX: Math.max(...xs),
			minY: Math.min(...ys),
			maxY: Math.max(...ys),
		};
	}, id);
}

const centerX = (box: AABB): number => (box.minX + box.maxX) / 2;

test.describe("コネクターの free 端点", () => {
	test("空きスペースへドロップした端点はドロップ位置に止まり、図形移動に追従しない", async ({
		canvas,
	}) => {
		// source 図形の content 描画座標（後でワールドとの平行移動オフセットを逆算する）。
		const srcContent = { minX: 300, minY: 150, maxX: 500, maxY: 250 };
		const sourceId = await canvas.drawShape(
			"Rectangle",
			{ x: srcContent.minX, y: srcContent.minY },
			{ x: srcContent.maxX, y: srcContent.maxY },
		);
		await canvas.deselect();

		// bottomCenter から「図形のない」空きスペースへドロップ → target は free アンカー。
		const dropContent = { x: 820, y: 520 };
		await canvas.selectAt({ x: 400, y: 200 });
		const connectorId = await canvas.createConnector(
			"bottomCenter",
			dropContent,
		);
		await canvas.deselect();

		const points = parsePoints(
			await canvas.objectById(connectorId).getAttribute("points"),
		);
		const sourceBox = await worldAABB(canvas, sourceId);

		// content → world の平行移動オフセットを source の描画座標と実 AABB から逆算する。
		const offsetX = sourceBox.minX - srcContent.minX;
		const offsetY = sourceBox.minY - srcContent.minY;
		const dropWorld = {
			x: dropContent.x + offsetX,
			y: dropContent.y + offsetY,
		};

		const ownedEnd = points[0];
		const freeEnd = points[points.length - 1];

		// owned 端（始点）は source 下辺中央に乗り、外向き（真下）へスタブを伸ばす。
		expect(
			distance(ownedEnd, { x: centerX(sourceBox), y: sourceBox.maxY }),
			"始点が source 下辺中央に乗ること",
		).toBeLessThanOrEqual(EPS);
		expect(Math.abs(points[1].x - ownedEnd.x)).toBeLessThanOrEqual(EPS);
		expect(
			points[1].y - ownedEnd.y,
			"owned 端は外向き（真下）へスタブを伸ばすこと",
		).toBeGreaterThan(10);

		// free 端（終点）はドロップ座標そのものに止まる（図形吸着・スタブ押し出しなし）。
		expect(
			distance(freeEnd, dropWorld),
			`free 端 ${JSON.stringify(freeEnd)} がドロップ位置 ${JSON.stringify(dropWorld)} に一致すること`,
		).toBeLessThanOrEqual(EPS);

		// ── source を動かす: owned 端は追従、free 端は固定 ──
		await canvas.drag({ x: 400, y: 200 }, { x: 400, y: 330 });
		await expect
			.poll(
				async () =>
					parsePoints(
						await canvas.objectById(connectorId).getAttribute("points"),
					)[0].y,
				{ message: "source 移動で owned 端が追従すること" },
			)
			.toBeGreaterThan(ownedEnd.y + 20);

		const movedPoints = parsePoints(
			await canvas.objectById(connectorId).getAttribute("points"),
		);
		const movedFreeEnd = movedPoints[movedPoints.length - 1];
		// free 端は絶対座標なので動かない。
		expect(
			distance(movedFreeEnd, freeEnd),
			"free 端は図形移動後も同じ絶対座標に留まること",
		).toBeLessThanOrEqual(EPS);
	});
});
