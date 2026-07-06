import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * ObjectMenu からのコネクター routing 切替（直線 / 直角）を UI レベルで検証する spec。
 *
 * connector-routing-geometry.spec は「既定（orthogonal）の出力幾何」までしか守っておらず、
 * RoutingMenu（ObjectMenu の routing ドロップダウン）を使って straight ⇄ orthogonal を
 * 切り替えたときに実際に描画経路が切り替わること——straight で 1 本の対角直線に、
 * orthogonal で直角の折れ線に戻ること、現在 routing が選択肢のハイライトに反映されること——
 * は未検証だった。SetConnectorRoutingCommand の eff果を実 UI 操作で守る。
 *
 * 配置は「斜めに離した 2 図形」を使う。この配置では straight = 2 頂点の対角線、
 * orthogonal = 直角の折れ線（3 頂点以上）になり、両 routing が幾何的に明確に区別できる。
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

/**
 * コネクターを「線上の一点」をクリックして選択する。
 * routing 切替で経路（頂点数）が変わるため、その時点の最長セグメントの中点を
 * 実描画 points から求めてクリックする（当たり判定の中心線上で確実に拾う）。
 */
async function selectConnector(canvas: CanvasDriver, connectorId: string) {
	const points = await readPoints(canvas, connectorId);
	let best = { mid: points[0], length: -1 };
	for (let i = 1; i < points.length; i++) {
		const a = points[i - 1];
		const b = points[i];
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
 * RoutingMenu のドロップダウンを開く（既に開いていれば何もしない）。
 * コマンドをクリックしてもドロップダウンは閉じないため、トグルを無条件に押すと
 * 開いているものを閉じてしまう。選択肢が見えていなければトグルを押して開く。
 */
async function ensureRoutingMenuOpen(canvas: CanvasDriver) {
	const anyOption = canvas.page.locator(
		'[data-part="command:setRoutingStraight"]',
	);
	if (!(await anyOption.isVisible())) {
		await canvas.openObjectMenu("connector-routing");
	}
	await expect(anyOption).toBeVisible();
}

/**
 * RoutingMenu を開いて指定 routing の選択肢を押す。
 * 切替後もコネクター選択は維持されるので、続けて別 routing へ切り替えられる。
 */
async function setRouting(
	canvas: CanvasDriver,
	routing: "orthogonal" | "straight",
) {
	await ensureRoutingMenuOpen(canvas);
	const commandId =
		routing === "orthogonal" ? "setRoutingOrthogonal" : "setRoutingStraight";
	await canvas.page.click(`[data-part="command:${commandId}"]`);
}

/** 斜めに離した 2 矩形を rightCenter→target でつなぎ、コネクター ID を返す（選択解除済み） */
async function buildDiagonalConnector(canvas: CanvasDriver): Promise<string> {
	await canvas.drawShape("Rectangle", { x: 300, y: 180 }, { x: 460, y: 280 });
	await canvas.deselect();
	await canvas.drawShape("Rectangle", { x: 820, y: 440 }, { x: 980, y: 540 });
	await canvas.deselect();

	await canvas.selectAt({ x: 380, y: 230 });
	const connectorId = await canvas.createConnector("rightCenter", {
		x: 900,
		y: 490,
	});
	await canvas.deselect();
	return connectorId;
}

test.describe("コネクターの routing 切替（ObjectMenu）", () => {
	test("既定は直角、straight 切替で対角直線、orthogonal 切替で直角へ戻る", async ({
		canvas,
	}) => {
		const connectorId = await buildDiagonalConnector(canvas);

		// 既定（routing 省略）は orthogonal。斜め配置なので折れて 3 頂点以上・全直角。
		const initial = await readPoints(canvas, connectorId);
		expect(
			initial.length,
			`既定 routing が直角の折れ線であること: ${JSON.stringify(initial)}`,
		).toBeGreaterThanOrEqual(3);
		assertOrthogonalSegments(initial);

		// straight へ切替 → 端点を直結する 1 セグメント（2 頂点）の対角線になる。
		await selectConnector(canvas, connectorId);
		await setRouting(canvas, "straight");
		await expect
			.poll(async () => (await readPoints(canvas, connectorId)).length, {
				message: "straight 切替で 2 頂点の直線になること",
			})
			.toBe(2);

		const straight = await readPoints(canvas, connectorId);
		// 対角配置なので、唯一のセグメントは水平でも垂直でもない（斜め）。
		expect(
			Math.abs(straight[0].x - straight[1].x),
			"straight は x が変化する（垂直でない）",
		).toBeGreaterThan(EPS);
		expect(
			Math.abs(straight[0].y - straight[1].y),
			"straight は y が変化する（水平でない）",
		).toBeGreaterThan(EPS);

		// orthogonal へ戻す → 再び直角の折れ線（3 頂点以上）。
		await setRouting(canvas, "orthogonal");
		await expect
			.poll(async () => (await readPoints(canvas, connectorId)).length, {
				message: "orthogonal 切替で折れ線（3 頂点以上）へ戻ること",
			})
			.toBeGreaterThanOrEqual(3);
		assertOrthogonalSegments(await readPoints(canvas, connectorId));
	});

	test("RoutingMenu の現在 routing が選択肢のハイライトに反映される", async ({
		canvas,
	}) => {
		const connectorId = await buildDiagonalConnector(canvas);
		await selectConnector(canvas, connectorId);

		const orthogonalOption = canvas.page.locator(
			'[data-part="command:setRoutingOrthogonal"]',
		);
		const straightOption = canvas.page.locator(
			'[data-part="command:setRoutingStraight"]',
		);

		// active 状態は ObjectMenuButton の isActive スタイル（border-color=accent / 非活性は
		// transparent）に出る。background はホバーでも変わるが border-color は active のみで
		// 変わるため、現在 routing の判定には border-color を読む。
		const borderColorOf = (
			locator: ReturnType<typeof canvas.page.locator>,
		): Promise<string> =>
			locator.evaluate((el) => getComputedStyle(el).borderColor);

		// 既定は orthogonal。ドロップダウンを開くと orthogonal 側だけが active。
		await ensureRoutingMenuOpen(canvas);
		const orthoBorderInitial = await borderColorOf(orthogonalOption);
		const straightBorderInitial = await borderColorOf(straightOption);
		expect(
			orthoBorderInitial,
			`既定では orthogonal 側が active（border が straight と異なる）: ortho=${orthoBorderInitial} straight=${straightBorderInitial}`,
		).not.toBe(straightBorderInitial);

		// straight へ切替 → 反映を points で確認してから、active が straight 側へ移ること。
		await canvas.page.click('[data-part="command:setRoutingStraight"]');
		await expect
			.poll(async () => (await readPoints(canvas, connectorId)).length, {
				message: "straight 切替が反映されること",
			})
			.toBe(2);

		await ensureRoutingMenuOpen(canvas);
		const orthoBorderAfter = await borderColorOf(orthogonalOption);
		const straightBorderAfter = await borderColorOf(straightOption);
		expect(
			straightBorderAfter,
			`straight 切替後は straight 側が active（border が orthogonal と異なる）: ortho=${orthoBorderAfter} straight=${straightBorderAfter}`,
		).not.toBe(orthoBorderAfter);
		// orthogonal は非活性化した（active が orthogonal から外れて straight へ移った）。
		expect(
			orthoBorderAfter,
			`orthogonal が非活性化すること: before=${orthoBorderInitial} after=${orthoBorderAfter}`,
		).not.toBe(orthoBorderInitial);
	});
});
