import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * 直角コネクターのセグメントを掴んで経路を手で決める操作を UI レベルで検証する spec。
 *
 * connector-routing-switch.spec は「線の形の切替」までしか守っておらず、直角のまま経路を
 * 決める導線——セグメントを垂直方向へドラッグすると `points` に頂点が入り、
 * 以後その頂点が経路そのものになること——は未検証だった。
 *
 * ここで守るのは6つ。(1) 中間セグメントは両端の頂点ごと動く、(2) 端のセグメントは長さを
 * 保ったまま動き、辺に残った端点との間に垂直な接続線分が入る、(3) 図形を動かすと端点に
 * 隣接する頂点が追従して直角が保たれる、(4) 当たりは線分全体にあり、選択していなくても中点以外から掴める、
 * (5) 直線への切替はそのとき描かれていた経路を points に焼き付けるので、形が飛ばない、
 * (6) 走行を重ねて一直線になった線は1本として動き、置き去りの斜め線分を作らない。
 * 回り込みが生じる配置は救わない仕様なので、ここでも要求しない。
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
function assertOrthogonalSegments(points: Vec[]) {
	for (let i = 1; i < points.length; i++) {
		const prev = points[i - 1];
		const cur = points[i];
		const horizontal = Math.abs(prev.y - cur.y) <= EPS;
		const vertical = Math.abs(prev.x - cur.x) <= EPS;
		expect(
			horizontal !== vertical,
			`セグメント ${i - 1}->${i} が直角でない（重複点 or 斜め）: ${JSON.stringify(prev)} -> ${JSON.stringify(cur)}`,
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

/** 最も長い垂直セグメントの x 座標。留めた走行位置を頂点数に依存せず読むための指標 */
async function longestVerticalRunX(
	canvas: CanvasDriver,
	connectorId: string,
): Promise<number> {
	const points = await readPoints(canvas, connectorId);
	let best = { x: NaN, length: -1 };
	for (let i = 1; i < points.length; i++) {
		const [a, b] = [points[i - 1], points[i]];
		const length = Math.abs(b.y - a.y);
		if (Math.abs(b.x - a.x) <= EPS && length > best.length) {
			best = { x: (a.x + b.x) / 2, length };
		}
	}
	expect(
		best.length,
		`垂直な走行が存在すること: ${JSON.stringify(points)}`,
	).toBeGreaterThan(0);
	return best.x;
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

/**
 * 斜めに離した 2 矩形を rightCenter → leftCenter でつなぐ。両端が辺アンカーなので既定は直角に
 * なり、折れ点 2 つ・中間に垂直の走行が 1 本ある経路ができる。
 */
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

test.describe("直角コネクターのセグメントドラッグ", () => {
	test("中間セグメントを動かすと走行位置が留まり、図形を動かしても直角が保たれる", async ({
		canvas,
	}) => {
		const connectorId = await buildDiagonalConnector(canvas);
		const initial = await readPoints(canvas, connectorId);
		assertOrthogonalSegments(initial);
		const initialRunX = await longestVerticalRunX(canvas, connectorId);

		await selectConnector(canvas, connectorId);
		await expect(
			canvas.page.locator(
				`[data-kind="connector"][data-id="${connectorId}"][data-part="segment:1"]`,
			),
		).toBeVisible();

		const mid = {
			x: (initial[1].x + initial[2].x) / 2,
			y: (initial[1].y + initial[2].y) / 2,
		};
		await canvas.drag(mid, { x: mid.x + 130, y: mid.y });

		await expect
			.poll(async () => longestVerticalRunX(canvas, connectorId), {
				message: "掴んだ走行が右へ移動すること",
			})
			.toBeGreaterThan(initialRunX + 60);
		assertOrthogonalSegments(await readPoints(canvas, connectorId));
		const pinnedRunX = await longestVerticalRunX(canvas, connectorId);

		// 接続元を下げる。端点に隣接する頂点が追従するので、斜めの線分は生じない。
		await canvas.deselect();
		await canvas.selectAt({ x: 380, y: 230 });
		await canvas.drag({ x: 380, y: 230 }, { x: 380, y: 400 });
		await canvas.deselect();

		const afterMove = await readPoints(canvas, connectorId);
		assertOrthogonalSegments(afterMove);
		expect(afterMove[0].y, "始点は接続元の辺中央へ追従する").toBeCloseTo(
			400,
			0,
		);
		expect(
			await longestVerticalRunX(canvas, connectorId),
			"留めた走行位置は図形を動かしても変わらない",
		).toBeCloseTo(pinnedRunX, 0);
	});

	test("端のセグメントは長さを保って動き、端点とは垂直な線分でつながる", async ({
		canvas,
	}) => {
		const connectorId = await buildDiagonalConnector(canvas);
		await selectConnector(canvas, connectorId);
		const initial = await readPoints(canvas, connectorId);

		// 先頭セグメント（接続元の右辺から出る水平線）を下へ引く。
		await canvas.drag(
			{ x: (initial[0].x + initial[1].x) / 2, y: initial[0].y },
			{ x: (initial[0].x + initial[1].x) / 2, y: initial[0].y + 110 },
		);

		const dragged = await readPoints(canvas, connectorId);
		assertOrthogonalSegments(dragged);
		expect(dragged[0], "始点は接続元の辺に残る").toEqual(initial[0]);
		expect(dragged[1].x, "端点から真下へ垂直な接続線分が降りる").toBeCloseTo(
			initial[0].x,
			0,
		);
		expect(dragged[1].y).toBeCloseTo(initial[0].y + 110, 0);
		expect(
			dragged[2].x,
			"ドラッグした線分は先端の x を保ったまま新しい高さへ移る",
		).toBeCloseTo(initial[1].x, 0);
		expect(dragged[2].y).toBeCloseTo(initial[0].y + 110, 0);
	});

	test("「経路を自動に戻す」で手で決めた頂点が捨てられる", async ({
		canvas,
	}) => {
		const connectorId = await buildDiagonalConnector(canvas);
		const initial = await readPoints(canvas, connectorId);
		await selectConnector(canvas, connectorId);

		const mid = {
			x: (initial[1].x + initial[2].x) / 2,
			y: (initial[1].y + initial[2].y) / 2,
		};
		await canvas.drag(mid, { x: mid.x + 130, y: mid.y });
		await expect
			.poll(async () => longestVerticalRunX(canvas, connectorId))
			.not.toBeCloseTo((initial[1].x + initial[2].x) / 2, 0);

		// 経路のリセットはモードではなく操作なので、routing メニューではなくコンテキストメニュー。
		const onLine = await readPoints(canvas, connectorId);
		await canvas.openContextMenu({
			x: (onLine[0].x + onLine[1].x) / 2,
			y: onLine[0].y,
		});
		await canvas.clickContextMenuCommand("resetConnectorRoute");

		await expect
			.poll(async () => readPoints(canvas, connectorId), {
				message: "自動ルーティングの経路へ戻ること",
			})
			.toEqual(initial);
	});

	test("選択していなくても線分の端寄りから掴んで動かせる", async ({
		canvas,
	}) => {
		const connectorId = await buildDiagonalConnector(canvas);
		const initial = await readPoints(canvas, connectorId);

		// 当たりはコネクター自身が持つので、選択を挟まずに掴める。位置は縦の走行の上端から
		// 25px——中点にハンドルを置く方式では当たりが無かったところ。
		const nearEnd = { x: initial[1].x, y: initial[1].y + 25 };
		await canvas.drag(nearEnd, { x: nearEnd.x + 130, y: nearEnd.y });

		const dragged = await readPoints(canvas, connectorId);
		assertOrthogonalSegments(dragged);
		expect(
			await longestVerticalRunX(canvas, connectorId),
			"端寄りを掴んでも走行が動く",
		).toBeCloseTo(initial[1].x + 130, 0);
	});

	test("走行を接続先の面の線上へ重ねても、1本の斜め線に潰れない", async ({
		canvas,
	}) => {
		const connectorId = await buildDiagonalConnector(canvas);
		const initial = await readPoints(canvas, connectorId);
		await selectConnector(canvas, connectorId);

		// 縦の走行を接続先の左辺の線（target の x）までドラッグして重ねる。角が1つだけ残る。
		const mid = {
			x: (initial[1].x + initial[2].x) / 2,
			y: (initial[1].y + initial[2].y) / 2,
		};
		await canvas.drag(mid, { x: initial[3].x, y: mid.y });

		await expect
			.poll(async () => longestVerticalRunX(canvas, connectorId), {
				message: "走行が接続先の面まで動くこと",
			})
			.toBeCloseTo(initial[3].x, 0);
		const collapsed = await readPoints(canvas, connectorId);
		assertOrthogonalSegments(collapsed);
		expect(collapsed.length, "L字（3点）に畳まれ、斜めの1本線にならない").toBe(
			3,
		);
	});

	test("走行を重ねて一直線にした後で掴んでも、斜めの線分にならない", async ({
		canvas,
	}) => {
		const connectorId = await buildDiagonalConnector(canvas);
		const initial = await readPoints(canvas, connectorId);
		await selectConnector(canvas, connectorId);

		// 先頭セグメントを下げる（端点から垂直に降りる接続線分と、下がった先の水平の走行ができる）。
		const firstMid = {
			x: (initial[0].x + initial[1].x) / 2,
			y: initial[0].y,
		};
		await canvas.drag(firstMid, { x: firstMid.x, y: firstMid.y + 110 });
		await expect
			.poll(async () => (await readPoints(canvas, connectorId)).length, {
				message: "垂直な接続線分で折れ点が増えること",
			})
			.toBeGreaterThan(initial.length);
		const lowered = await readPoints(canvas, connectorId);
		assertOrthogonalSegments(lowered);

		// 下がった走行（lowered[1]→lowered[2]）を元の高さへ戻し、出だしの線と重ねて一直線にする。
		const runMid = {
			x: (lowered[1].x + lowered[2].x) / 2,
			y: lowered[1].y,
		};
		await canvas.drag(runMid, { x: runMid.x, y: initial[0].y });
		const merged = await readPoints(canvas, connectorId);
		assertOrthogonalSegments(merged);

		// 一直線になった線を掴んで下げる。重なった走行が別々に動くと、置き去りの側が斜めになる。
		const grab = { x: initial[1].x - 40, y: merged[0].y };
		await canvas.drag(grab, { x: grab.x, y: grab.y + 60 });
		await expect
			.poll(
				async () => {
					const points = await readPoints(canvas, connectorId);
					return points.some(
						(point, index) =>
							index > 0 &&
							Math.abs(points[index - 1].y - point.y) <= EPS &&
							Math.abs(point.y - (merged[0].y + 60)) <= 2,
					);
				},
				{ message: "掴んだ線がドラッグ先の高さへ移ること" },
			)
			.toBe(true);
		assertOrthogonalSegments(await readPoints(canvas, connectorId));
	});

	test("図形を動かした後で直線へ切り替えても、見えていた形のまま切り替わる", async ({
		canvas,
	}) => {
		const connectorId = await buildDiagonalConnector(canvas);
		const initial = await readPoints(canvas, connectorId);
		const initialRunX = await longestVerticalRunX(canvas, connectorId);
		await selectConnector(canvas, connectorId);

		const mid = {
			x: (initial[1].x + initial[2].x) / 2,
			y: (initial[1].y + initial[2].y) / 2,
		};
		await canvas.drag(mid, { x: mid.x + 130, y: mid.y });
		await expect
			.poll(async () => longestVerticalRunX(canvas, connectorId))
			.toBeGreaterThan(initialRunX + 60);

		// 接続元を動かして、保存済みの頂点列と描画（align 済み）の座標をずらしてから切り替える。
		await canvas.deselect();
		await canvas.selectAt({ x: 380, y: 230 });
		await canvas.drag({ x: 380, y: 230 }, { x: 380, y: 400 });
		await canvas.deselect();
		const beforeSwitch = await readPoints(canvas, connectorId);

		await selectConnector(canvas, connectorId);
		await canvas.openObjectMenu("connector-routing");
		await canvas.page.click('[data-part="command:setRoutingStraight"]');
		await expect(
			canvas.page.locator(
				`[data-kind="connector"][data-id="${connectorId}"][data-part^="segment:"]`,
			),
		).toHaveCount(0);

		const afterSwitch = await readPoints(canvas, connectorId);
		expect(afterSwitch.length, "切替で頂点は増減しない").toBe(
			beforeSwitch.length,
		);
		afterSwitch.forEach((point, index) => {
			expect(point.x).toBeCloseTo(beforeSwitch[index].x, 0);
			expect(point.y).toBeCloseTo(beforeSwitch[index].y, 0);
		});
	});

	test("直線ルーティングにはセグメントの当たりが出ない", async ({ canvas }) => {
		const connectorId = await buildDiagonalConnector(canvas);
		await selectConnector(canvas, connectorId);

		await canvas.openObjectMenu("connector-routing");
		await canvas.page.click('[data-part="command:setRoutingStraight"]');

		await expect
			.poll(async () => (await readPoints(canvas, connectorId)).length, {
				message: "straight 切替で 2 頂点の直線になること",
			})
			.toBe(2);
		await expect(
			canvas.page.locator(
				`[data-kind="connector"][data-id="${connectorId}"][data-part^="segment:"]`,
			),
		).toHaveCount(0);
	});
});
