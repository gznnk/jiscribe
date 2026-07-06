import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * 選択中コネクターの「端点編集ハンドル」が経路の端点に正確に重なることを検証する spec。
 *
 * コネクターを選択すると、両端に再接続用の編集ハンドル
 * （data-id=<id> + data-part="endpoint:source/target"）が出る。connector-reconnect.spec は
 * このハンドルを掴んでドラッグする操作を守るが、ハンドル自体が *経路の端点に乗っているか*
 * は未検証だった。ハンドルが端点からずれると「線の端を掴んだつもりが掴めない／別の場所が
 * 動く」操作バグになる。
 *
 * ここでは多点経路（エルボあり）のコネクターで、source/target ハンドルの中心が points の
 * 先頭/末尾の端点に一致することを守る。zoom=1 ではワールド座標＝コンテンツ座標なので、
 * ハンドルの画面 boundingBox を toContent して points と突き合わせる。
 */

type Vec = { x: number; y: number };

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

/** コントロール（CSS セレクタ）の中心をコンテンツ座標で返す（zoom=1 ではワールド座標と一致） */
async function controlContentCenter(
	canvas: CanvasDriver,
	controlSelector: string,
): Promise<Vec> {
	const loc = canvas.page.locator(controlSelector);
	await expect(loc).toBeVisible();
	const box = await loc.boundingBox();
	if (!box) {
		throw new Error(`コントロール ${controlSelector} の位置が取得できない`);
	}
	return canvas.toContent({
		x: box.x + box.width / 2,
		y: box.y + box.height / 2,
	});
}

test.describe("コネクターの端点編集ハンドル", () => {
	test("source/target ハンドルが経路の端点に正確に重なる", async ({
		canvas,
	}) => {
		// 斜め配置でエルボのある多点経路にして、ハンドルが「端点」に乗る（中間点ではない）ことを
		// はっきり確かめる。
		await canvas.drawShape("Rectangle", { x: 300, y: 180 }, { x: 460, y: 280 });
		await canvas.deselect();
		await canvas.drawShape("Rectangle", { x: 760, y: 440 }, { x: 960, y: 540 });
		await canvas.deselect();

		await canvas.selectAt({ x: 380, y: 230 });
		const connectorId = await canvas.createConnector("rightCenter", {
			x: 860,
			y: 490,
		});
		await canvas.deselect();

		const points = parsePoints(
			await canvas.objectById(connectorId).getAttribute("points"),
		);
		// エルボがある（端点が中間点と区別できる）こと。
		expect(points.length).toBeGreaterThanOrEqual(3);
		const startPoint = points[0];
		const endPoint = points[points.length - 1];

		// 経路の最長セグメントの中点をクリックしてコネクターを選択する（角を避けて確実に当てる）。
		let clickAt = {
			x: (points[0].x + points[1].x) / 2,
			y: (points[0].y + points[1].y) / 2,
		};
		let longest = -1;
		for (let i = 1; i < points.length; i++) {
			const len = distance(points[i - 1], points[i]);
			if (len > longest) {
				longest = len;
				clickAt = {
					x: (points[i - 1].x + points[i].x) / 2,
					y: (points[i - 1].y + points[i].y) / 2,
				};
			}
		}
		await canvas.clickAt(clickAt);

		// 端点編集ハンドルが両端に出る。
		const sourceHandle = await controlContentCenter(
			canvas,
			`[data-id="${connectorId}"][data-part="endpoint:source"]`,
		);
		const targetHandle = await controlContentCenter(
			canvas,
			`[data-id="${connectorId}"][data-part="endpoint:target"]`,
		);

		// 各ハンドルの中心が経路の端点に一致する。
		expect(
			distance(sourceHandle, startPoint),
			`source ハンドル ${JSON.stringify(sourceHandle)} が始点 ${JSON.stringify(startPoint)} に重なること`,
		).toBeLessThanOrEqual(EPS);
		expect(
			distance(targetHandle, endPoint),
			`target ハンドル ${JSON.stringify(targetHandle)} が終点 ${JSON.stringify(endPoint)} に重なること`,
		).toBeLessThanOrEqual(EPS);

		// 取り違え防止: source/target ハンドルは別々の端（十分離れている）にある。
		expect(
			distance(sourceHandle, targetHandle),
			"source と target のハンドルが別々の端にあること",
		).toBeGreaterThan(50);
	});
});
