import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";
import { selectors } from "../../support/selectors";

/**
 * 複数選択に対するテキストスタイル一括適用を守る。
 *
 * handlePropertyUpdate は選択中の全 id にプロパティを適用する。fill の一括適用は別途テスト済みだが、
 * text 系プロパティ（fontSize / fontWeight）も同じループで全選択へ伝播するかは未カバーだった。
 * もし最初の 1 つにしか乗らなければ製品バグになる経路なので、両図形の描画結果で守る。
 */

/** テキスト入りの矩形を 2 つ並べて描き、id を返す（各描画後に選択解除） */
async function drawTwoLabeledRects(
	canvas: CanvasDriver,
): Promise<{ left: string; right: string }> {
	const left = await canvas.drawShape(
		"Rectangle",
		{ x: 340, y: 180 },
		{ x: 470, y: 300 },
	);
	await canvas.typeTextAt({ x: 405, y: 240 }, "A");
	await canvas.commitText();

	const right = await canvas.drawShape(
		"Rectangle",
		{ x: 560, y: 180 },
		{ x: 690, y: 300 },
	);
	await canvas.typeTextAt({ x: 625, y: 240 }, "B");
	await canvas.commitText();

	return { left, right };
}

/** 両矩形を囲むマーキーで複数選択する */
async function marqueeSelectBoth(canvas: CanvasDriver) {
	await canvas.drag({ x: 310, y: 150 }, { x: 720, y: 330 });
	await expect
		.poll(async () => (await canvas.visibleControlIds()).length)
		.toBeGreaterThan(0);
}

test.describe("複数選択へのテキストスタイル一括適用", () => {
	test("複数選択でフォントサイズを変えると全テキストに反映される", async ({
		canvas,
	}) => {
		const { left, right } = await drawTwoLabeledRects(canvas);
		await marqueeSelectBoth(canvas);

		await canvas.openObjectMenu("font-size");
		await canvas.setNumberInput("fontSize", 44);

		await expect
			.poll(async () => (await canvas.textStyleOf(left))?.fontSize)
			.toBe("44px");
		expect((await canvas.textStyleOf(right))?.fontSize).toBe("44px");
	});

	test("複数選択で太字にすると全テキストが bold になる", async ({ canvas }) => {
		const { left, right } = await drawTwoLabeledRects(canvas);
		await marqueeSelectBoth(canvas);

		await canvas.page.click(selectors.objectMenuSet("fontWeight", "bold"));

		await expect
			.poll(async () => (await canvas.textStyleOf(left))?.fontWeight)
			.toBe("700");
		expect((await canvas.textStyleOf(right))?.fontWeight).toBe("700");
	});
});
