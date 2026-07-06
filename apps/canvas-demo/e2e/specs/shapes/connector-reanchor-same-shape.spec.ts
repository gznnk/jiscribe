import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * 同じ図形の「別の辺」へ端点を張り替える（再アンカー）ことを検証する spec。
 *
 * connector-reconnect.spec は端点の owner（接続先の図形そのもの）を別の図形へ張り替える経路を
 * 守るが、owner は同じまま「接続する辺（アンカー）だけを変える」経路は未検証だった
 * （例: target を B の topCenter から rightCenter へ）。アンカー id の差し替えが効かないと、
 * 端点ハンドルを別の辺へ落としても古い辺に張り付いたままになる。
 *
 * target 端点ハンドルを B の上辺中央から右辺中央へドラッグし、端点が B の右辺中央へ移ること、
 * かつ依然 B に接続して追従することを、図形の実ジオメトリと突き合わせて守る。
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

const topCenter = (box: AABB): Vec => ({
	x: (box.minX + box.maxX) / 2,
	y: box.minY,
});
const rightCenter = (box: AABB): Vec => ({
	x: box.maxX,
	y: (box.minY + box.maxY) / 2,
});

async function endPoint(canvas: CanvasDriver, id: string): Promise<Vec> {
	const points = parsePoints(
		await canvas.objectById(id).getAttribute("points"),
	);
	return points[points.length - 1];
}

/** コントロール（CSS セレクタ）の中心からコンテンツ座標 `to` へドラッグする */
async function dragControlTo(
	canvas: CanvasDriver,
	controlSelector: string,
	to: Vec,
) {
	const control = canvas.page.locator(controlSelector);
	await expect(control).toBeVisible();
	const box = await control.boundingBox();
	if (!box) {
		throw new Error(`コントロール ${controlSelector} の位置が取得できない`);
	}
	await canvas.drag(
		canvas.toContent({ x: box.x + box.width / 2, y: box.y + box.height / 2 }),
		to,
		12,
	);
}

test.describe("同じ図形の別の辺への再アンカー", () => {
	test("target 端点を B の上辺から右辺へ張り替えると、端点が右辺中央へ移る", async ({
		canvas,
	}) => {
		await canvas.drawShape("Rectangle", { x: 400, y: 150 }, { x: 600, y: 250 });
		await canvas.deselect();
		const bId = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 450 },
			{ x: 600, y: 550 },
		);
		await canvas.deselect();

		// A.bottomCenter → B.topCenter（B 上辺中央へドロップ）。
		await canvas.selectAt({ x: 500, y: 200 });
		const id = await canvas.createConnector("bottomCenter", { x: 500, y: 455 });
		await canvas.deselect();

		const bBox = await worldAABB(canvas, bId);
		// 初期 target は B 上辺中央。
		expect(
			distance(await endPoint(canvas, id), topCenter(bBox)),
			"初期 target が B 上辺中央に乗ること",
		).toBeLessThanOrEqual(EPS);

		// コネクター（両端 owned の縦線）を選択して target ハンドルを出す。
		await canvas.clickAt({ x: 500, y: 350 });
		await expect(
			canvas.page.locator(`[data-id="${id}"][data-part="endpoint:target"]`),
		).toBeVisible();

		// target ハンドルを B の右辺中央付近へドラッグ → rightCenter へ再アンカー。
		await dragControlTo(
			canvas,
			`[data-id="${id}"][data-part="endpoint:target"]`,
			{
				x: 590,
				y: 500,
			},
		);
		await canvas.deselect();

		// target が B の右辺中央へ移った（上辺からは離れた）。
		const movedEnd = await endPoint(canvas, id);
		expect(
			distance(movedEnd, rightCenter(bBox)),
			`target ${JSON.stringify(movedEnd)} が B 右辺中央 ${JSON.stringify(rightCenter(bBox))} へ移ること`,
		).toBeLessThanOrEqual(EPS);
		expect(
			distance(movedEnd, topCenter(bBox)),
			"target が元の上辺中央からは離れていること",
		).toBeGreaterThan(20);

		// 依然 B に接続している: B を動かすと右辺中央のまま追従する。
		await canvas.drag({ x: 500, y: 500 }, { x: 760, y: 500 });
		await expect
			.poll(async () => (await endPoint(canvas, id)).x, {
				message: "再アンカー後も B に追従すること",
			})
			.toBeGreaterThan(rightCenter(bBox).x + 100);
		const bMoved = await worldAABB(canvas, bId);
		expect(
			distance(await endPoint(canvas, id), rightCenter(bMoved)),
			"追従後も target が（移動後の）B 右辺中央に乗ること",
		).toBeLessThanOrEqual(EPS);
	});
});
