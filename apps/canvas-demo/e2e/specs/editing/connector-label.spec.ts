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
});
