import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * 接続図形を「グループ化」してグループごと動かしたとき、コネクターが追従することを検証する spec。
 *
 * 図形をグループ化すると、その図形はグループ変換の下にネストされる。コネクター端点は図形 id を
 * 参照して解決されるため、グループ変換が合成されないと「グループを動かしたのにコネクターが
 * 取り残される」退行になり得る。group 系 spec はコネクターを含まず、connector 追従系 spec は
 * グループを含まないため、この合流点は隙間だった。
 *
 * A と（無関係な）C をグループ化し、B は外に置く。A→B のコネクターでグループを動かすと、
 * 始点（A 側）は追従し、終点（B 側）は不動であることを、移動後の図形ジオメトリと突き合わせて守る。
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

const bottomCenter = (box: AABB): Vec => ({
	x: (box.minX + box.maxX) / 2,
	y: box.maxY,
});
const topCenter = (box: AABB): Vec => ({
	x: (box.minX + box.maxX) / 2,
	y: box.minY,
});

async function endpoints(
	canvas: CanvasDriver,
	id: string,
): Promise<{ start: Vec; end: Vec }> {
	const points = parsePoints(
		await canvas.objectById(id).getAttribute("points"),
	);
	return { start: points[0], end: points[points.length - 1] };
}

test.describe("グループ移動でのコネクター追従", () => {
	test("接続図形を含むグループを動かすと、その端は追従し相手端は不動", async ({
		canvas,
	}) => {
		// A(左上) と C(右上) をグループ化、B(下) は外。A→B を接続する。
		const aId = await canvas.drawShape(
			"Rectangle",
			{ x: 300, y: 150 },
			{ x: 460, y: 250 },
		);
		await canvas.deselect();
		await canvas.drawShape("Rectangle", { x: 600, y: 150 }, { x: 760, y: 250 });
		await canvas.deselect();
		const bId = await canvas.drawShape(
			"Rectangle",
			{ x: 300, y: 450 },
			{ x: 460, y: 550 },
		);
		await canvas.deselect();

		await canvas.selectAt({ x: 380, y: 200 });
		const connectorId = await canvas.createConnector("bottomCenter", {
			x: 380,
			y: 455,
		});
		await canvas.deselect();

		// 接続前提の確認: 始点 = A 下辺中央、終点 = B 上辺中央。
		const before = await endpoints(canvas, connectorId);
		const aBefore = await worldAABB(canvas, aId);
		const bBox = await worldAABB(canvas, bId);
		expect(
			distance(before.start, bottomCenter(aBefore)),
			"始点が A 下辺中央に乗ること",
		).toBeLessThanOrEqual(EPS);
		const bTop = topCenter(bBox);
		expect(
			distance(before.end, bTop),
			"終点が B 上辺中央に乗ること",
		).toBeLessThanOrEqual(EPS);

		// A と C を選択してグループ化（B は含めない）。
		await canvas.selectAt({ x: 380, y: 200 });
		await canvas.ctrlClickAt({ x: 680, y: 200 });
		await canvas.group();
		await canvas.deselect();

		// グループ（A+C）を右へ動かす。A を掴めばグループごと動く。
		await canvas.drag({ x: 380, y: 200 }, { x: 580, y: 200 });
		await expect
			.poll(async () => (await endpoints(canvas, connectorId)).start.x, {
				message: "グループ移動で始点（A 側）が追従すること",
			})
			.toBeGreaterThan(before.start.x + 100);
		await canvas.deselect();

		const after = await endpoints(canvas, connectorId);
		const aAfter = await worldAABB(canvas, aId);

		// 始点は（グループ変換が合成された）A の新しい下辺中央に乗る。
		expect(
			distance(after.start, bottomCenter(aAfter)),
			`始点 ${JSON.stringify(after.start)} が移動後の A 下辺中央 ${JSON.stringify(bottomCenter(aAfter))} に乗ること`,
		).toBeLessThanOrEqual(EPS);
		// 終点は B 上辺中央のまま不動（B はグループ外）。
		expect(
			distance(after.end, bTop),
			"終点は B 上辺中央のまま不動であること",
		).toBeLessThanOrEqual(EPS);
	});
});
