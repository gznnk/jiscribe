import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";
import { selectors } from "../../support/selectors";

/**
 * ObjectMenu のテキストスタイル（フォントサイズ・文字色・太字・整列）を変えたとき、
 * 図形に重なって描かれる TextOverlay の描画結果が追従することを検証する。
 *
 * これらは「メニュー操作 → property 更新 → reducer → 再描画」という共通経路を通る。
 * 既存スイートは色・線種・角丸は見ているがフォント系は手付かずだったため、ここで埋める。
 */
test.describe("ObjectMenu によるテキストスタイル設定", () => {
	/** rect を描いてテキストを入れ、選択状態に戻したうえで data-id を返す */
	async function drawLabeledRect(canvas: CanvasDriver): Promise<string> {
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 180 },
			{ x: 640, y: 360 },
		);
		await canvas.typeTextAt({ x: 520, y: 270 }, "Label");
		await canvas.commitText();
		// commitText は空きスペースをクリックして選択解除するので選択し直す
		await canvas.selectAt({ x: 520, y: 270 });
		return id;
	}

	test("テキスト領域のオフセットは x/y ではなく transform に載る（リサイズ中の1pxちらつき対策）", async ({
		canvas,
	}) => {
		const id = await drawLabeledRect(canvas);

		// Chromium は foreignObject の HTML を「箱の位置を整数に丸めた場所」へ
		// ラスタライズする。領域オフセット(-height/2 ...)と図形の translate(中心)は
		// どちらも height/2 を含み、和は一定なのに片方だけ丸められると打ち消しが
		// 崩れ、リサイズ中にテキストが 1px 単位でちらつく。オフセットを transform に
		// 畳んで和を丸め前に確定させるのが対策なので、x/y が 0 のままであることを守る。
		const box = await canvas.page.evaluate((objectId) => {
			const fo = document
				.querySelector(`[data-id="${objectId}"]`)
				?.parentElement?.querySelector("foreignObject");
			return fo ? { x: fo.getAttribute("x"), y: fo.getAttribute("y") } : null;
		}, id);
		expect(box).toEqual({ x: "0", y: "0" });
	});

	test("フォントサイズを変えると描画テキストのサイズが追従する", async ({
		canvas,
	}) => {
		const id = await drawLabeledRect(canvas);

		const before = await canvas.textStyleOf(id);
		expect(before).not.toBeNull();
		expect(before?.fontSize).not.toBe("40px");

		await canvas.openObjectMenu("font-size");
		await canvas.setNumberInput("fontSize", 40);

		await expect
			.poll(async () => (await canvas.textStyleOf(id))?.fontSize)
			.toBe("40px");
	});

	test("文字色を変えると描画テキストの色が追従する", async ({ canvas }) => {
		const id = await drawLabeledRect(canvas);

		await canvas.setColor("font-color", "#e11d48");

		await expect
			.poll(async () => (await canvas.textStyleOf(id))?.color)
			.toBe(await canvas.normalizeColor("#e11d48"));
	});

	test("Bold トグルで font-weight が bold になり、もう一度押すと normal に戻る", async ({
		canvas,
	}) => {
		const id = await drawLabeledRect(canvas);

		// Bold は単独トグルボタン（ドロップダウンを開かず即時設定）。
		await canvas.page.click(selectors.objectMenuSet("fontWeight", "bold"));
		await expect
			.poll(async () => (await canvas.textStyleOf(id))?.fontWeight)
			.toBe("700");

		// もう一度押すとボタンの data-id が normal 側へ反転して解除できる。
		await canvas.page.click(selectors.objectMenuSet("fontWeight", "normal"));
		await expect
			.poll(async () => (await canvas.textStyleOf(id))?.fontWeight)
			.toBe("400");
	});

	test("水平整列を right にすると text-align が追従する", async ({
		canvas,
	}) => {
		const id = await drawLabeledRect(canvas);

		const before = await canvas.textStyleOf(id);
		expect(before?.textAlign).not.toBe("right");

		await canvas.openObjectMenu("alignment");
		await canvas.page.click(selectors.objectMenuSet("textAlign", "right"));

		await expect
			.poll(async () => (await canvas.textStyleOf(id))?.textAlign)
			.toBe("right");
	});

	test("水平整列を left / center に切り替えると text-align が追従する", async ({
		canvas,
	}) => {
		const id = await drawLabeledRect(canvas);

		// 既定の描画は center。まず left にして追従（center→left）を確認する。
		expect((await canvas.textStyleOf(id))?.textAlign).toBe("center");

		await canvas.openObjectMenu("alignment");
		await canvas.page.click(selectors.objectMenuSet("textAlign", "left"));
		await expect
			.poll(async () => (await canvas.textStyleOf(id))?.textAlign)
			.toBe("left");

		// セクションは開いたままなので、続けて center へ戻せる（left→center の遷移も検証）。
		await canvas.page.click(selectors.objectMenuSet("textAlign", "center"));
		await expect
			.poll(async () => (await canvas.textStyleOf(id))?.textAlign)
			.toBe("center");
	});

	test("縦整列を top にすると wrapper の align-items が追従する", async ({
		canvas,
	}) => {
		const id = await drawLabeledRect(canvas);

		// 既定は middle（align-items: center）。
		expect((await canvas.textStyleOf(id))?.verticalAlign).not.toBe(
			"flex-start",
		);

		await canvas.setVerticalAlign("top");

		await expect
			.poll(async () => (await canvas.textStyleOf(id))?.verticalAlign)
			.toBe("flex-start");
	});

	test("縦整列を bottom にすると wrapper の align-items が追従する", async ({
		canvas,
	}) => {
		const id = await drawLabeledRect(canvas);

		expect((await canvas.textStyleOf(id))?.verticalAlign).not.toBe("flex-end");

		await canvas.setVerticalAlign("bottom");

		await expect
			.poll(async () => (await canvas.textStyleOf(id))?.verticalAlign)
			.toBe("flex-end");
	});

	test("フォントサイズ変更は undo で戻り、redo で再適用される", async ({
		canvas,
	}) => {
		const id = await drawLabeledRect(canvas);

		const original = (await canvas.textStyleOf(id))?.fontSize;
		expect(original).toBeTruthy();
		expect(original).not.toBe("40px");

		await canvas.openObjectMenu("font-size");
		await canvas.setNumberInput("fontSize", 40);
		await expect
			.poll(async () => (await canvas.textStyleOf(id))?.fontSize)
			.toBe("40px");

		await canvas.undo();
		await expect
			.poll(async () => (await canvas.textStyleOf(id))?.fontSize)
			.toBe(original);

		await canvas.redo();
		await expect
			.poll(async () => (await canvas.textStyleOf(id))?.fontSize)
			.toBe("40px");
	});
});
