import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";
import { selectors } from "../../support/selectors";

/**
 * flowchart フライアウトの図形が作成でき、期待どおりの SVG 要素で描画されることを守る。
 * 特に「型は使い回し・preset で意味を着せる」判断を固定する:
 * - process   … rect 型を流用（`<rect>`）
 * - decision  … diamond 型を流用（`<polygon>`）
 * - onPageConnector  … ellipse 型を流用した小円（`<ellipse>`）
 * - offPageConnector … 固有のホームベース五角形型（`<polygon>`）
 */

const FLOWCHART = "flowchart";

/** キャンバスの computed cursor。crosshair=描画モード ON。 */
async function canvasCursor(canvas: CanvasDriver): Promise<string> {
	return canvas.page
		.locator('[data-kind="canvas"]')
		.evaluate((el) => getComputedStyle(el).cursor);
}

/** flowchart フライアウトから presetId を1つ対角ドラッグで作成し、その SVG タグ名を返す。 */
async function createFromFlyout(
	canvas: CanvasDriver,
	presetId: string,
	from: { x: number; y: number },
	to: { x: number; y: number },
): Promise<string | null> {
	const before = await canvas.captureObjects();
	const beforeIds = new Set(before.map((obj) => obj.id));

	await canvas.page.click(selectors.categoryButton(FLOWCHART));
	const item = canvas.page.locator(selectors.shapeItem(presetId));
	await expect(item).toBeVisible();
	await item.click();
	await expect
		.poll(() => canvasCursor(canvas), {
			message: `${presetId} クリックで描画モードに入ること`,
		})
		.toBe("crosshair");

	await canvas.drag(from, to);
	await expect
		.poll(async () => (await canvas.captureObjects()).length, {
			message: `${presetId} が1つ作成されること`,
		})
		.toBe(before.length + 1);

	const created = (await canvas.captureObjects()).find(
		(obj) => !beforeIds.has(obj.id),
	);
	return created?.tag ?? null;
}

test.describe("flowchart パレット", () => {
	test("各図形がフライアウトから作成でき、正しい SVG 要素で描画される", async ({
		canvas,
	}) => {
		// 型を使い回す preset（process=rect / decision=diamond / on-page=ellipse）
		expect(
			await createFromFlyout(
				canvas,
				"process",
				{ x: 300, y: 220 },
				{ x: 440, y: 300 },
			),
		).toBe("rect");

		expect(
			await createFromFlyout(
				canvas,
				"diamond",
				{ x: 480, y: 220 },
				{ x: 600, y: 320 },
			),
		).toBe("polygon");

		expect(
			await createFromFlyout(
				canvas,
				"onPageConnector",
				{ x: 300, y: 360 },
				{ x: 380, y: 440 },
			),
		).toBe("ellipse");

		// 固有の型を持つ off-page connector（五角形）
		expect(
			await createFromFlyout(
				canvas,
				"offPageConnector",
				{ x: 460, y: 360 },
				{ x: 580, y: 460 },
			),
		).toBe("polygon");
	});

	test("multiDocument / storedData / loopLimit がフライアウトから作成できる", async ({
		canvas,
	}) => {
		// multiDocument は3枚重ねの複数要素描画（data-kind は g にのみ付く）
		expect(
			await createFromFlyout(
				canvas,
				"multiDocument",
				{ x: 300, y: 220 },
				{ x: 440, y: 320 },
			),
		).toBe("g");

		expect(
			await createFromFlyout(
				canvas,
				"storedData",
				{ x: 480, y: 220 },
				{ x: 620, y: 300 },
			),
		).toBe("path");

		expect(
			await createFromFlyout(
				canvas,
				"loopLimit",
				{ x: 300, y: 360 },
				{ x: 440, y: 440 },
			),
		).toBe("polygon");
	});
});
