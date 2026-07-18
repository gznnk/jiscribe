import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * 既定ポリゴン（正多角形）の頂点ジオメトリを精密に守る。
 *
 * polygon-vertex.spec は「頂点数が 5」までで、各頂点が正しい位置（外接楕円上に等角 72°
 * 間隔・先頭が真上）にあるかは未検証だった。実装（PolygonShapeFactory.buildPolygonPoints）は
 *   angle_i = 2π·i/5 − π/2、頂点 = (cx + rx·cosθ, cy + ry·sinθ)
 * で、描画 bbox の外接楕円に内接する正五角形を作る。ここでは描画矩形から決まる
 * cx,cy,rx,ry に対し、DOM の points 配列がこの式どおりかを 1 点ずつ照合して
 * 「等角配置・先頭真上・楕円内接」をまとめて固める。点の歪み・回転・個数変化で落ちる。
 *
 * Polygon 要素は transform を持たず points は絶対 world 座標（zoom=1）なので直接比較できる。
 */

const SIDES = 5;
const TOLERANCE_PX = 0.5;

/** 外接楕円 (cx,cy,rx,ry) に内接する正多角形の頂点（factory と同式） */
function expectedPolygon(
	cx: number,
	cy: number,
	rx: number,
	ry: number,
): { x: number; y: number }[] {
	return Array.from({ length: SIDES }, (_, i) => {
		const angle = (2 * Math.PI * i) / SIDES - Math.PI / 2;
		return { x: cx + rx * Math.cos(angle), y: cy + ry * Math.sin(angle) };
	});
}

async function readVertices(
	canvas: CanvasDriver,
	id: string,
): Promise<{ x: number; y: number }[]> {
	const points = await canvas.objectById(id).getAttribute("points");
	if (!points) {
		throw new Error("polygon の points 属性が取得できない");
	}
	return points
		.trim()
		.split(/\s+/)
		.map((pair) => {
			const [x, y] = pair.split(",").map(Number);
			return { x, y };
		});
}

test.describe("既定ポリゴンの正多角形ジオメトリ", () => {
	test("描画した五角形は外接楕円に等角 72° 間隔で内接し、先頭頂点は真上に来る", async ({
		canvas,
	}) => {
		// (400,200)-(600,360): 中心(500,280)・rx=100・ry=80。
		const id = await canvas.drawShape(
			"Polygon",
			{ x: 400, y: 200 },
			{ x: 600, y: 360 },
		);

		const vertices = await readVertices(canvas, id);
		expect(vertices).toHaveLength(SIDES);

		const expected = expectedPolygon(500, 280, 100, 80);
		// 先頭頂点は真上（中心の rx 方向には動かず ry 分だけ上）= (500,200)。
		expect(Math.abs(vertices[0].x - 500)).toBeLessThanOrEqual(TOLERANCE_PX);
		expect(Math.abs(vertices[0].y - 200)).toBeLessThanOrEqual(TOLERANCE_PX);

		// 各頂点が式どおりの位置にある（等角配置・楕円内接を 1 点ずつ照合）。
		for (let i = 0; i < SIDES; i++) {
			expect(
				Math.abs(vertices[i].x - expected[i].x),
				`頂点${i} の x`,
			).toBeLessThanOrEqual(TOLERANCE_PX);
			expect(
				Math.abs(vertices[i].y - expected[i].y),
				`頂点${i} の y`,
			).toBeLessThanOrEqual(TOLERANCE_PX);
		}
	});
});
