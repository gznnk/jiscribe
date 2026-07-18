import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";
import { selectors } from "../../support/selectors";

/**
 * コネクターの矢印（arrow head）設定の反映と永続。
 *
 * 矢印は端点ごとに `polygon[data-kind=connector][data-id=<id>]` として描かれ、
 * 種別が "None" のときは要素自体が描かれない。既定の新規コネクターは終端だけに
 * ConcaveTriangle を持つ。矢印系（startArrow / endArrow / swapArrows）は既存スイートで
 * 未カバーだったため、「メニュー操作 → 描画要素の増減・入れ替え」を守る。
 */

/** 上下 2 矩形を縦コネクターで結び、コネクター ID を返す（接続後は選択解除済み） */
async function buildConnector(canvas: CanvasDriver): Promise<string> {
	await canvas.drawShape("Rectangle", { x: 400, y: 150 }, { x: 600, y: 250 });
	await canvas.deselect();
	await canvas.drawShape("Rectangle", { x: 400, y: 450 }, { x: 600, y: 550 });
	await canvas.deselect();

	await canvas.selectAt({ x: 500, y: 200 });
	const connectorId = await canvas.createConnector("bottomCenter", {
		x: 500,
		y: 450,
	});
	await canvas.deselect();
	return connectorId;
}

/** 線上をクリックしてコネクターを選択し、矢印メニューの表示を待つ */
async function selectConnector(canvas: CanvasDriver) {
	await canvas.clickAt({ x: 500, y: 350 });
	await expect(
		canvas.page.locator(selectors.objectMenuToggle("arrow-head-end")),
	).toBeVisible();
}

/** 指定コネクターの矢印 polygon 数 */
async function arrowCount(canvas: CanvasDriver, id: string): Promise<number> {
	return canvas.page.evaluate(
		(cid) =>
			document.querySelectorAll(
				`polygon[data-kind="connector"][data-id="${cid}"]`,
			).length,
		id,
	);
}

/**
 * 始端・終端それぞれに最も近い矢印 polygon の points 文字列（＝矢印形状の指紋）を返す。
 * 端点は当たり判定用ポリライン（data-id 付き）の両端から取り、矢印の matrix(e,f) との
 * 距離で対応づける。矢印が無い端は null。
 */
async function arrowShapesByEnd(
	canvas: CanvasDriver,
	id: string,
): Promise<{ source: string | null; target: string | null }> {
	return canvas.page.evaluate((cid) => {
		const els = [...document.querySelectorAll(`[data-id="${cid}"]`)];
		const hit = els.find((el) => el.tagName.toLowerCase() === "polyline");
		const coords = (hit?.getAttribute("points") ?? "")
			.trim()
			.split(/\s+/)
			.map((pair) => pair.split(",").map(Number));
		const source = { x: coords[0]?.[0], y: coords[0]?.[1] };
		const last = coords[coords.length - 1] ?? [];
		const target = { x: last[0], y: last[1] };

		const arrows = [
			...document.querySelectorAll(
				`polygon[data-kind="connector"][data-id="${cid}"]`,
			),
		].map((poly) => {
			const matched = (poly.getAttribute("transform") ?? "").match(
				/matrix\(([^)]+)\)/,
			);
			const nums = matched ? matched[1].split(",").map(Number) : [];
			return { points: poly.getAttribute("points"), x: nums[4], y: nums[5] };
		});

		const nearest = (point: { x?: number; y?: number }) => {
			let best: string | null = null;
			let bestDist = Infinity;
			for (const arrow of arrows) {
				const dx = arrow.x - (point.x ?? 0);
				const dy = arrow.y - (point.y ?? 0);
				const dist = dx * dx + dy * dy;
				if (dist < bestDist) {
					bestDist = dist;
					best = arrow.points;
				}
			}
			return best;
		};

		return { source: nearest(source), target: nearest(target) };
	}, id);
}

test.describe("コネクターの矢印", () => {
	test("既定は終端のみ矢印を持ち、endArrow を None にすると消える", async ({
		canvas,
	}) => {
		const id = await buildConnector(canvas);
		expect(await arrowCount(canvas, id)).toBe(1);

		await selectConnector(canvas);
		await canvas.openObjectMenu("arrow-head-end");
		await canvas.page.click(selectors.objectMenuSet("endArrow", "None"));

		await expect.poll(() => arrowCount(canvas, id)).toBe(0);
	});

	test("startArrow を設定すると両端に矢印が並ぶ（2つ）", async ({ canvas }) => {
		const id = await buildConnector(canvas);
		expect(await arrowCount(canvas, id)).toBe(1);

		await selectConnector(canvas);
		await canvas.openObjectMenu("arrow-head-start");
		await canvas.page.click(
			selectors.objectMenuSet("startArrow", "FilledTriangle"),
		);

		await expect.poll(() => arrowCount(canvas, id)).toBe(2);
	});

	test("swapArrows で始端と終端の矢印形状が入れ替わる", async ({ canvas }) => {
		const id = await buildConnector(canvas);

		// 両端に異なる形状を付けて区別できるようにする（既定 end=ConcaveTriangle）。
		await selectConnector(canvas);
		await canvas.openObjectMenu("arrow-head-start");
		await canvas.page.click(
			selectors.objectMenuSet("startArrow", "FilledTriangle"),
		);
		await expect.poll(() => arrowCount(canvas, id)).toBe(2);

		const before = await arrowShapesByEnd(canvas, id);
		expect(before.source).toBeTruthy();
		expect(before.target).toBeTruthy();
		expect(before.source).not.toBe(before.target);

		await canvas.page.click(selectors.objectMenuCommand("swapArrows"));

		await expect
			.poll(async () => (await arrowShapesByEnd(canvas, id)).source)
			.toBe(before.target);
		expect((await arrowShapesByEnd(canvas, id)).target).toBe(before.source);
	});

	test("endArrow を None にする操作は undo で戻り、redo で再適用される", async ({
		canvas,
	}) => {
		const id = await buildConnector(canvas);
		expect(await arrowCount(canvas, id)).toBe(1);

		await selectConnector(canvas);
		await canvas.openObjectMenu("arrow-head-end");
		await canvas.page.click(selectors.objectMenuSet("endArrow", "None"));
		await expect.poll(() => arrowCount(canvas, id)).toBe(0);

		await canvas.undo();
		await expect.poll(() => arrowCount(canvas, id)).toBe(1);

		await canvas.redo();
		await expect.poll(() => arrowCount(canvas, id)).toBe(0);
	});
});
