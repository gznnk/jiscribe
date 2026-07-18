import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";
import { selectors } from "../../support/selectors";

/**
 * ShapeLibrary のカテゴリフライアウト（#184 案A）の中核挙動を守る。
 *
 * - カテゴリボタン押下でフライアウトが開き、中の図形項目（ピン留めと同じ
 *   `data-part="item:<presetId>"` 契約）が現れる。
 * - フライアウト内の図形は既存の ShapeLibraryItemHandler をそのまま通るため、
 *   クリックで描画モードに入り、キャンバスへのドラッグで実際に作成できる。
 * - 図形を選び終えた pointerup、外側クリック、Escape のいずれでも閉じる。
 *
 * 描画モードの ON は Canvas の cursor: crosshair で観測する（フライアウト項目は
 * pointerup で unmount されるため、ツールボタンの cursor ではなくキャンバス側を見る）。
 */

const FLOWCHART = "flowchart";

/** キャンバス（data-kind="canvas"）の computed cursor。crosshair=描画モード ON。 */
async function canvasCursor(canvas: CanvasDriver): Promise<string> {
	return canvas.page
		.locator('[data-kind="canvas"]')
		.evaluate((el) => getComputedStyle(el).cursor);
}

test.describe("ShapeLibrary カテゴリフライアウト", () => {
	test("カテゴリを開いてフライアウトの図形をドラッグ作成できる", async ({
		canvas,
	}) => {
		// 初期状態ではフライアウトは閉じている
		await expect(
			canvas.page.locator(selectors.categoryFlyout(FLOWCHART)),
		).toHaveCount(0);

		// カテゴリボタン押下でフライアウトが開き、diamond 項目が現れる
		await canvas.page.click(selectors.categoryButton(FLOWCHART));
		await expect(
			canvas.page.locator(selectors.categoryFlyout(FLOWCHART)),
		).toBeVisible();
		const diamondItem = canvas.page.locator(selectors.shapeItem("diamond"));
		await expect(diamondItem).toBeVisible();

		// 項目クリックで描画モードに入り（Canvas が crosshair になる）、
		// pointerup でフライアウトは閉じる
		const before = (await canvas.captureObjects()).length;
		await diamondItem.click();
		await expect
			.poll(() => canvasCursor(canvas), {
				message: "フライアウトの図形クリックで描画モードに入ること",
			})
			.toBe("crosshair");
		await expect(
			canvas.page.locator(selectors.categoryFlyout(FLOWCHART)),
		).toHaveCount(0);

		// キャンバスへドラッグして実際に作成される（上端エッジゾーンを避けて内部へ）
		await canvas.drag({ x: 360, y: 240 }, { x: 520, y: 360 });
		await expect
			.poll(async () => (await canvas.captureObjects()).length, {
				message: "フライアウト経由で新規図形が作成されること",
			})
			.toBe(before + 1);
	});

	test("Escape と外側クリックでフライアウトが閉じる", async ({ canvas }) => {
		// Escape で閉じる
		await canvas.page.click(selectors.categoryButton(FLOWCHART));
		await expect(
			canvas.page.locator(selectors.categoryFlyout(FLOWCHART)),
		).toBeVisible();
		await canvas.page.keyboard.press("Escape");
		await expect(
			canvas.page.locator(selectors.categoryFlyout(FLOWCHART)),
		).toHaveCount(0);

		// 開き直して、キャンバスの空き領域クリック（外側）で閉じる
		await canvas.page.click(selectors.categoryButton(FLOWCHART));
		await expect(
			canvas.page.locator(selectors.categoryFlyout(FLOWCHART)),
		).toBeVisible();
		const empty = canvas.toScreen({ x: 700, y: 600 });
		await canvas.page.mouse.click(empty.x, empty.y);
		await expect(
			canvas.page.locator(selectors.categoryFlyout(FLOWCHART)),
		).toHaveCount(0);
	});
});
