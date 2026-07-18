import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * コネクターの「当たり判定の幅」を検証する spec。
 *
 * コネクターは細い視覚線（ConnectorElement, pointer-events: none）とは別に、太い透明な
 * 当たり判定線（ConnectorHitArea, stroke-width: 12, pointer-events: stroke）で描かれ、
 * 線そのものをピンポイントで狙わなくてもクリックで選択できるようになっている。
 * arrange/connector-hit-test.spec は z-order による選択優先度を守るが、この「線から少し
 * 外れていても当たり判定の帯（±6px）の内側なら選択でき、外側なら選択されない」という
 * 当たり判定幅そのものは未検証だった。
 *
 * 当たり判定線の stroke-width は 12（中心線から半幅 6px）。zoom=1 ではワールド座標＝
 * コンテンツ座標なので、コネクターの points からクリック位置を相対的に作って検証する。
 */

type Vec = { x: number; y: number };

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

/** コネクター選択時に出る ObjectMenu（線色トグル）のロケーター */
function lineColorToggle(canvas: CanvasDriver) {
	return canvas.page.locator('[data-part="toggle:line-color"]');
}

/** 左右に並べた 2 矩形を rightCenter → leftCenter で結び、水平な直線コネクターを作る。 */
async function buildHorizontalConnector(canvas: CanvasDriver): Promise<string> {
	await canvas.drawShape("Rectangle", { x: 300, y: 200 }, { x: 460, y: 300 });
	await canvas.deselect();
	await canvas.drawShape("Rectangle", { x: 760, y: 200 }, { x: 920, y: 300 });
	await canvas.deselect();

	await canvas.selectAt({ x: 380, y: 250 });
	const id = await canvas.createConnector("rightCenter", { x: 840, y: 250 });
	await canvas.deselect();
	return id;
}

test.describe("コネクターの当たり判定幅", () => {
	test("線から少し外れたクリックでも帯の内側なら選択でき、外側なら選択されない", async ({
		canvas,
	}) => {
		const connectorId = await buildHorizontalConnector(canvas);

		const points = parsePoints(
			await canvas.objectById(connectorId).getAttribute("points"),
		);
		// 一直線（2 頂点）なので中点で当たり判定を試す。
		expect(points.length).toBe(2);
		const mid = {
			x: (points[0].x + points[1].x) / 2,
			y: (points[0].y + points[1].y) / 2,
		};

		// 帯の内側（中心線から 4px）をクリック → 線そのものを外していても選択される。
		await canvas.clickAt({ x: mid.x, y: mid.y + 4 });
		await expect(
			lineColorToggle(canvas),
			"中心線から 4px（当たり判定 ±6px の内側）で選択できること",
		).toBeVisible();

		await canvas.deselect();

		// 帯の外側（中心線から 20px）をクリック → 何も選択されない。
		await canvas.clickAt({ x: mid.x, y: mid.y + 20 });
		await expect(
			lineColorToggle(canvas),
			"中心線から 20px（当たり判定の外側）では選択されないこと",
		).toHaveCount(0);
		expect(
			await canvas.hasAnyControl(),
			"外側クリックで選択コントロールが出ないこと",
		).toBe(false);

		// 念のため、線上ど真ん中のクリックでは選択できる（当たり判定が生きている確認）。
		await canvas.clickAt({ x: mid.x, y: mid.y });
		await expect(
			lineColorToggle(canvas),
			"線上のクリックで選択できること",
		).toBeVisible();
	});
});
