import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * 付箋（Sticky）への接続を検証する spec。
 *
 * コネクターは connectable な図形に繋がる（rect / ellipse / sticky / diamond）。既存のコネクター
 * spec は Rectangle / Ellipse ばかりで、別オブジェクト種別である Sticky（注釈・<g> 描画）への
 * 接続は未検証だった。Sticky は geometry="rect" なので、辺アンカー解決・輪郭吸着・追従が
 * rect と同様に効くはずで、種別をまたいで結線が機能することを守る。
 *
 * Sticky はクリック配置（placeShape）でキャンバス中央に置かれるため、位置は実行時に
 * worldAABB で読み取る（zoom=1 ではワールド座標＝コンテンツ座標）。
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
		const root = document.querySelector(`[data-id="${targetId}"]`);
		if (!(root instanceof SVGGraphicsElement)) {
			throw new Error(`図形 ${targetId} が SVGGraphicsElement でない`);
		}
		// Sticky は <g data-id> 内に「影 polygon（filter 付き）＋本体 polygon」で描かれ、
		// <g> の bbox は影ぶん膨らむ。本体ジオメトリ（filter なしの polygon、または rect/ellipse）を
		// 優先して輪郭の AABB を取る。
		const geom =
			root.tagName.toLowerCase() === "g"
				? ((root.querySelector(
						"rect, ellipse, polygon:not([filter])",
					) as SVGGraphicsElement | null) ?? root)
				: root;
		const el = geom;
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

const center = (box: AABB): Vec => ({
	x: (box.minX + box.maxX) / 2,
	y: (box.minY + box.maxY) / 2,
});
const centerY = (box: AABB): number => (box.minY + box.maxY) / 2;

function onPerimeter(p: Vec, box: AABB): boolean {
	const onVerticalEdge =
		(Math.abs(p.x - box.minX) <= EPS || Math.abs(p.x - box.maxX) <= EPS) &&
		p.y >= box.minY - EPS &&
		p.y <= box.maxY + EPS;
	const onHorizontalEdge =
		(Math.abs(p.y - box.minY) <= EPS || Math.abs(p.y - box.maxY) <= EPS) &&
		p.x >= box.minX - EPS &&
		p.x <= box.maxX + EPS;
	return onVerticalEdge || onHorizontalEdge;
}

test.describe("付箋へのコネクター接続", () => {
	test("Rectangle から Sticky へ接続でき、端点が付箋の辺に乗って追従する", async ({
		canvas,
	}) => {
		// Sticky をキャンバス中央へ配置し、実位置を読む。
		const stickyId = await canvas.placeShape("Sticky");
		await canvas.deselect();
		const stickyBox = await worldAABB(canvas, stickyId);
		const stickyCenter = center(stickyBox);

		// Sticky の十分左に Rectangle を描く（重ならない位置）。
		const rectId = await canvas.drawShape(
			"Rectangle",
			{ x: 120, y: stickyCenter.y - 50 },
			{ x: 280, y: stickyCenter.y + 50 },
		);
		await canvas.deselect();

		// Rectangle の rightCenter から Sticky の中心へドロップして接続する。
		await canvas.selectAt({ x: 200, y: stickyCenter.y });
		const connectorId = await canvas.createConnector(
			"rightCenter",
			stickyCenter,
		);
		await canvas.deselect();

		const points = parsePoints(
			await canvas.objectById(connectorId).getAttribute("points"),
		);
		const rectBox = await worldAABB(canvas, rectId);

		// 始点は Rectangle の右辺中央に乗る。
		expect(
			distance(points[0], { x: rectBox.maxX, y: centerY(rectBox) }),
			`始点が Rectangle 右辺中央に乗ること`,
		).toBeLessThanOrEqual(EPS);

		// 終点は Sticky の輪郭（周）上に乗る（中心へドロップ→輪郭吸着）。
		expect(
			onPerimeter(points[points.length - 1], stickyBox),
			`終点 ${JSON.stringify(points[points.length - 1])} が Sticky の周上に乗ること`,
		).toBe(true);

		// Sticky を動かすとコネクターが追従する（＝Sticky に実接続されている）。
		const before = await canvas.objectById(connectorId).getAttribute("points");
		await canvas.drag(stickyCenter, {
			x: stickyCenter.x + 120,
			y: stickyCenter.y + 80,
		});
		await expect
			.poll(() => canvas.objectById(connectorId).getAttribute("points"), {
				message: "Sticky 移動でコネクターが追従すること",
			})
			.not.toBe(before);

		// 追従後も終点は（移動後の）Sticky 輪郭上に乗り続ける。
		const movedPoints = parsePoints(
			await canvas.objectById(connectorId).getAttribute("points"),
		);
		const movedStickyBox = await worldAABB(canvas, stickyId);
		expect(
			onPerimeter(movedPoints[movedPoints.length - 1], movedStickyBox),
			"追従後も終点が移動後の Sticky 周上に乗ること",
		).toBe(true);
	});
});
