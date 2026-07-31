import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * セグメントドラッグの**操作列**を UI レベルで守る spec。
 *
 * connector-segment-drag.spec は個々の操作を単発で守っているが、過去の退行は
 * 「単発では正しいのに、列で踏むと壊れる」形で出た（掃除の取りこぼし、undo 境界など）。
 * ここでは間に図形移動・undo/redo・routing 切替を挟んだ列で、
 * (1) セグメントドラッグが undo/redo で正確に往復すること、
 * (2) L字化した経路が図形移動・直線切替往復を経ても形と直角を保つこと、を守る。
 */

type Vec = { x: number; y: number };
const EPS = 1.5;

/** polyline の points 属性 "x1,y1 x2,y2 ..." を座標配列へパースする */
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

/** 隣り合う頂点がすべて水平 or 垂直（=直角・退化なし）であることを検査する */
function assertOrthogonalSegments(points: Vec[], label: string) {
	for (let i = 1; i < points.length; i++) {
		const horizontal = Math.abs(points[i - 1].y - points[i].y) <= EPS;
		const vertical = Math.abs(points[i - 1].x - points[i].x) <= EPS;
		expect(
			horizontal !== vertical,
			`${label}: セグメント ${i - 1}->${i} が直角でない（重複点 or 斜め）: ${JSON.stringify(points)}`,
		).toBe(true);
	}
}

/** コネクターの現在の描画 points を読む */
async function readPoints(
	canvas: CanvasDriver,
	connectorId: string,
): Promise<Vec[]> {
	return parsePoints(
		await canvas.objectById(connectorId).getAttribute("points"),
	);
}

/** コネクターを最長セグメントの中点でクリックして選択する */
async function selectConnector(canvas: CanvasDriver, connectorId: string) {
	const points = await readPoints(canvas, connectorId);
	let best = { mid: points[0], length: -1 };
	for (let i = 1; i < points.length; i++) {
		const [a, b] = [points[i - 1], points[i]];
		const length = Math.hypot(b.x - a.x, b.y - a.y);
		if (length > best.length) {
			best = { mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, length };
		}
	}
	await canvas.clickAt(best.mid);
	await expect(
		canvas.page.locator('[data-part="toggle:connector-routing"]'),
	).toBeVisible();
}

/** 斜めに離した 2 矩形を rightCenter → leftCenter でつなぐ（connector-segment-drag.spec と同配置） */
async function buildDiagonalConnector(canvas: CanvasDriver): Promise<string> {
	await canvas.drawShape("Rectangle", { x: 300, y: 180 }, { x: 460, y: 280 });
	await canvas.deselect();
	await canvas.drawShape("Rectangle", { x: 820, y: 440 }, { x: 980, y: 540 });
	await canvas.deselect();
	await canvas.selectAt({ x: 380, y: 230 });
	const connectorId = await canvas.createConnector("rightCenter", {
		x: 820,
		y: 490,
	});
	await canvas.deselect();
	return connectorId;
}

test.describe("セグメントドラッグの操作列", () => {
	test("連続ドラッグは undo/redo で正確に往復し、リセットで自動経路へ戻る", async ({
		canvas,
	}) => {
		const connectorId = await buildDiagonalConnector(canvas);
		const initial = await readPoints(canvas, connectorId);
		await selectConnector(canvas, connectorId);

		// 1. 中間の走行を右へ
		const mid = {
			x: (initial[1].x + initial[2].x) / 2,
			y: (initial[1].y + initial[2].y) / 2,
		};
		await canvas.drag(mid, { x: mid.x + 130, y: mid.y });
		const afterRun = await readPoints(canvas, connectorId);
		assertOrthogonalSegments(afterRun, "走行ドラッグ後");

		// 2. 先頭セグメントを下へ（垂直接続で折れ点が増える）
		await canvas.drag(
			{ x: (initial[0].x + afterRun[1].x) / 2, y: initial[0].y },
			{ x: (initial[0].x + afterRun[1].x) / 2, y: initial[0].y + 110 },
		);
		const afterEnd = await readPoints(canvas, connectorId);
		assertOrthogonalSegments(afterEnd, "端ドラッグ後");
		expect(afterEnd.length).toBeGreaterThan(afterRun.length);

		// 3. undo ×2 で自動経路まで正確に戻り、redo ×2 で完全に復帰する
		await canvas.undo();
		await expect
			.poll(async () => (await readPoints(canvas, connectorId)).length)
			.toBe(afterRun.length);
		await canvas.undo();
		await expect
			.poll(async () => readPoints(canvas, connectorId))
			.toEqual(initial);
		await canvas.redo();
		await canvas.redo();
		await expect
			.poll(async () => readPoints(canvas, connectorId))
			.toEqual(afterEnd);

		// 4. リセットで自動経路へ
		const onLine = await readPoints(canvas, connectorId);
		await selectConnector(canvas, connectorId);
		await canvas.openContextMenu({
			x: (onLine[2].x + onLine[3].x) / 2,
			y: (onLine[2].y + onLine[3].y) / 2,
		});
		await canvas.clickContextMenuCommand("resetConnectorRoute");
		await expect
			.poll(async () => readPoints(canvas, connectorId))
			.toEqual(initial);
	});

	test("L字化した経路は図形移動・直線切替往復・再移動を経ても形と直角を保つ", async ({
		canvas,
	}) => {
		const connectorId = await buildDiagonalConnector(canvas);
		const initial = await readPoints(canvas, connectorId);
		await selectConnector(canvas, connectorId);

		// 1. 縦の走行を接続先の面へ重ねて L 字（頂点1つ）に畳む
		const mid = {
			x: (initial[1].x + initial[2].x) / 2,
			y: (initial[1].y + initial[2].y) / 2,
		};
		await canvas.drag(mid, { x: initial[3].x, y: mid.y });
		await expect
			.poll(async () => (await readPoints(canvas, connectorId)).length)
			.toBe(3);
		assertOrthogonalSegments(await readPoints(canvas, connectorId), "L字化後");

		// 2. 接続元を下げても L 字のまま直角
		await canvas.deselect();
		await canvas.selectAt({ x: 380, y: 230 });
		await canvas.drag({ x: 380, y: 230 }, { x: 380, y: 380 });
		await canvas.deselect();
		const afterMove = await readPoints(canvas, connectorId);
		assertOrthogonalSegments(afterMove, "図形移動後");
		expect(afterMove.length).toBe(3);

		// 3. 直線へ切替（焼き付け）→ 直角へ戻す。形は変わらない。
		//    コマンド後もドロップダウンは開いたままなので、2回目はトグルを押さずに直接押す
		await selectConnector(canvas, connectorId);
		await canvas.openObjectMenu("connector-routing");
		await canvas.page.click('[data-part="command:setRoutingStraight"]');
		await expect
			.poll(async () => readPoints(canvas, connectorId))
			.toEqual(afterMove);
		await canvas.page.click('[data-part="command:setRoutingOrthogonal"]');
		await expect
			.poll(async () => readPoints(canvas, connectorId))
			.toEqual(afterMove);

		// 4. さらに接続先を動かしても直角
		await canvas.deselect();
		await canvas.selectAt({ x: 900, y: 490 });
		await canvas.drag({ x: 900, y: 490 }, { x: 900, y: 600 });
		await canvas.deselect();
		assertOrthogonalSegments(
			await readPoints(canvas, connectorId),
			"接続先移動後",
		);
	});
});
