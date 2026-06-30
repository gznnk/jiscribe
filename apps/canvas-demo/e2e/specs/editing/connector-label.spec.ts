import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";
import { selectors } from "../../support/selectors";

/**
 * コネクターのラベル（label.text）編集の e2e。
 *
 * - 線上のダブルクリックでラベル編集を開始できる
 * - 入力・確定すると経路上に水平ラベルが描かれる（foreignObject[data-kind=connector]）
 * - 再度ダブルクリックすると既存テキストがプリフィルされる
 * - 空文字で確定するとラベルが取り除かれる
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

/** コネクターの最初のセグメント中点（必ず線上の点）を返す。 */
async function pointOnConnector(
	canvas: CanvasDriver,
	connectorId: string,
): Promise<Vec> {
	const points = parsePoints(
		await canvas.objectById(connectorId).getAttribute("points"),
	);
	expect(points.length).toBeGreaterThanOrEqual(2);
	return {
		x: (points[0].x + points[1].x) / 2,
		y: (points[0].y + points[1].y) / 2,
	};
}

test.describe("コネクターのラベル", () => {
	test("ダブルクリックでラベルを追加・再編集・削除できる", async ({
		canvas,
	}) => {
		await canvas.drawShape("Rectangle", { x: 300, y: 150 }, { x: 500, y: 250 });
		await canvas.deselect();
		await canvas.drawShape("Rectangle", { x: 700, y: 300 }, { x: 900, y: 400 });
		await canvas.deselect();

		await canvas.selectAt({ x: 400, y: 200 });
		const connectorId = await canvas.createConnector("rightCenter", {
			x: 715,
			y: 350,
		});
		await canvas.deselect();

		const labelLocator = canvas.page.locator(
			`foreignObject[data-kind=connector][data-id="${connectorId}"]`,
		);

		// 追加: 線上をダブルクリック → 入力 → 確定。
		const onLine = await pointOnConnector(canvas, connectorId);
		await canvas.typeTextAt(onLine, "Yes");
		await canvas.commitText();
		await expect(labelLocator).toContainText("Yes");

		// 再編集: 既存テキストがプリフィルされる。
		const screen = canvas.toScreen(onLine);
		await canvas.page.mouse.dblclick(screen.x, screen.y);
		await expect(canvas.page.locator(selectors.textEditor)).toBeVisible();
		await expect(canvas.textArea()).toHaveValue("Yes");

		// 削除: 空文字で確定するとラベルごと消える。
		await canvas.textArea().fill("");
		await canvas.commitText();
		await expect(labelLocator).toHaveCount(0);
	});

	test("スタイリングUIでラベルの背景色を変更できる（label.fill）", async ({
		canvas,
	}) => {
		await canvas.drawShape("Rectangle", { x: 300, y: 150 }, { x: 500, y: 250 });
		await canvas.deselect();
		await canvas.drawShape("Rectangle", { x: 700, y: 300 }, { x: 900, y: 400 });
		await canvas.deselect();

		await canvas.selectAt({ x: 400, y: 200 });
		const connectorId = await canvas.createConnector("rightCenter", {
			x: 715,
			y: 350,
		});
		await canvas.deselect();

		// ラベルを付ける（label-style メニューはラベルがある時だけ出る）。
		const onLine = await pointOnConnector(canvas, connectorId);
		await canvas.typeTextAt(onLine, "Yes");
		await canvas.commitText();

		// コネクターを選択してラベル背景色メニューを開き、背景色スウォッチを押す。
		await canvas.clickAt(onLine);
		await canvas.openObjectMenu("label-bg-color");
		await canvas.page.click(selectors.objectMenuSet("label.fill", "#dc2626"));

		// ラベルボックスの背景がドット記法経由で更新される（label.fill → #dc2626）。
		const labelBox = canvas.page
			.locator(`foreignObject[data-kind=connector][data-id="${connectorId}"]`)
			.locator("div")
			.first();
		await expect(labelBox).toHaveCSS("background-color", "rgb(220, 38, 38)");
	});

	test("スタイリングUIでラベルの枠線スタイル（太さ・破線）を変更できる", async ({
		canvas,
	}) => {
		await canvas.drawShape("Rectangle", { x: 300, y: 150 }, { x: 500, y: 250 });
		await canvas.deselect();
		await canvas.drawShape("Rectangle", { x: 700, y: 300 }, { x: 900, y: 400 });
		await canvas.deselect();

		await canvas.selectAt({ x: 400, y: 200 });
		const connectorId = await canvas.createConnector("rightCenter", {
			x: 715,
			y: 350,
		});
		await canvas.deselect();

		const onLine = await pointOnConnector(canvas, connectorId);
		await canvas.typeTextAt(onLine, "Yes");
		await canvas.commitText();

		// 枠線スタイルメニューを開き、太さを 2 にして破線を選ぶ。
		await canvas.clickAt(onLine);
		await canvas.openObjectMenu("label-border-style");
		await canvas.page
			.locator('[data-testid="menu-number-input:label.strokeWidth"]')
			.fill("2");
		await canvas.page.click(
			selectors.objectMenuSet("label.strokeDashType", "dashed"),
		);

		const labelBox = canvas.page
			.locator(`foreignObject[data-kind=connector][data-id="${connectorId}"]`)
			.locator("div")
			.first();
		await expect(labelBox).toHaveCSS("border-top-style", "dashed");
		await expect(labelBox).toHaveCSS("border-top-width", "2px");
	});
});
