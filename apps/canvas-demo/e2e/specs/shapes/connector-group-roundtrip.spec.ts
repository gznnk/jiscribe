import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * 接続図形のグループ化→グループ解除（round-trip）でコネクターがずれず、接続が生き続けることを
 * 検証する spec。
 *
 * グループ化は図形をグループ変換の下にネストし、解除でそれを畳み戻す。どちらも図形のワールド
 * 位置は変えないので、コネクター端点も動いてはならない。変換合成を取り違えると「グループ化
 * した瞬間に線が飛ぶ」「解除で接続が切れる」退行になる。connector-follow-group-move は
 * グループごと動かす経路を守るが、位置を変えない round-trip と解除後の追従は別の隙間だった。
 *
 * A→B 接続で A を（無関係な C と）グループ化→解除し、各段階で端点が不動なこと、解除後に A を
 * 動かすと始点が追従することを守る。
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

async function endpoints(
	canvas: CanvasDriver,
	id: string,
): Promise<{ start: Vec; end: Vec }> {
	const points = parsePoints(
		await canvas.objectById(id).getAttribute("points"),
	);
	return { start: points[0], end: points[points.length - 1] };
}

test.describe("グループ化 round-trip とコネクター", () => {
	test("グループ化・解除で端点が動かず、解除後も追従する", async ({
		canvas,
	}) => {
		const aId = await canvas.drawShape(
			"Rectangle",
			{ x: 300, y: 150 },
			{ x: 460, y: 250 },
		);
		await canvas.deselect();
		await canvas.drawShape("Rectangle", { x: 600, y: 150 }, { x: 760, y: 250 });
		await canvas.deselect();
		await canvas.drawShape("Rectangle", { x: 300, y: 450 }, { x: 460, y: 550 });
		await canvas.deselect();

		await canvas.selectAt({ x: 380, y: 200 });
		const connectorId = await canvas.createConnector("bottomCenter", {
			x: 380,
			y: 455,
		});
		await canvas.deselect();

		const initial = await endpoints(canvas, connectorId);

		// A と C をグループ化（A のワールド位置は変わらない）。
		await canvas.selectAt({ x: 380, y: 200 });
		await canvas.ctrlClickAt({ x: 680, y: 200 });
		await canvas.group();
		await canvas.deselect();

		// グループ化しても端点は動かない。
		const afterGroup = await endpoints(canvas, connectorId);
		expect(
			distance(afterGroup.start, initial.start),
			"グループ化で始点が動かないこと",
		).toBeLessThanOrEqual(EPS);
		expect(
			distance(afterGroup.end, initial.end),
			"グループ化で終点が動かないこと",
		).toBeLessThanOrEqual(EPS);

		// グループを選択して解除（A のワールド位置は変わらない）。
		await canvas.selectAt({ x: 380, y: 200 });
		await canvas.ungroup();
		await canvas.deselect();

		// 解除しても端点は動かない。
		const afterUngroup = await endpoints(canvas, connectorId);
		expect(
			distance(afterUngroup.start, initial.start),
			"グループ解除で始点が動かないこと",
		).toBeLessThanOrEqual(EPS);
		expect(
			distance(afterUngroup.end, initial.end),
			"グループ解除で終点が動かないこと",
		).toBeLessThanOrEqual(EPS);

		// 解除後に A を動かすと、接続が生きていて始点が追従する。
		await canvas.drag({ x: 380, y: 200 }, { x: 580, y: 200 });
		await expect
			.poll(async () => (await endpoints(canvas, connectorId)).start.x, {
				message: "解除後に A を動かすと始点が追従すること",
			})
			.toBeGreaterThan(initial.start.x + 100);

		const aAfter = await worldAABB(canvas, aId);
		const finalStart = (await endpoints(canvas, connectorId)).start;
		expect(
			distance(finalStart, bottomCenter(aAfter)),
			"解除後の移動でも始点が A 下辺中央に乗ること",
		).toBeLessThanOrEqual(EPS);
	});
});
