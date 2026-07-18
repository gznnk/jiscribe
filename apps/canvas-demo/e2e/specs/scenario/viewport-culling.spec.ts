import { expect, test } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * ビューポートカリング（#212）の検証。
 *
 * 可視矩形（ビューポート＋マージン）と交差しない図形は DOM にレンダーされない。
 * - パンで画面外に出た図形は DOM から外れ、視界に戻すと再描画される
 * - エクスポートはライブ SVG の clone なので、カリングを一時停止して
 *   画面外の図形も出力に含める（終わったらカリングに戻る）
 */

const findObject = async (canvas: CanvasDriver, id: string) =>
	(await canvas.captureObjects()).find((obj) => obj.id === id);

test("画面外に出た図形は DOM から外れ、視界に戻すと再描画される", async ({
	canvas,
}) => {
	const id = await canvas.drawShape(
		"Rectangle",
		{ x: 150, y: 120 },
		{ x: 400, y: 260 },
	);
	await canvas.deselect();
	const before = await findObject(canvas, id);
	expect(before).toBeDefined();

	// 左へ 650px パン → 図形（右端 x=400）はカリングマージンを超えて画面外になる
	await canvas.middleDrag({ x: 800, y: 400 }, { x: 150, y: 400 });
	await expect
		.poll(async () => (await findObject(canvas, id)) === undefined, {
			message: "画面外の図形が DOM から外れること",
		})
		.toBe(true);

	// 元の視界へ戻す → 再描画され、transform も変わっていない
	await canvas.middleDrag({ x: 150, y: 400 }, { x: 800, y: 400 });
	await expect
		.poll(async () => (await findObject(canvas, id))?.transform ?? null, {
			message: "視界に戻した図形が再描画されること",
		})
		.toBe(before!.transform);
});

test("エクスポートはカリングされた画面外の図形も含む", async ({
	canvas,
	page,
}) => {
	const id = await canvas.drawShape(
		"Rectangle",
		{ x: 150, y: 120 },
		{ x: 400, y: 260 },
	);
	await canvas.deselect();

	// パンで図形をカリングさせてからエクスポートする
	await canvas.middleDrag({ x: 800, y: 400 }, { x: 150, y: 400 });
	await expect
		.poll(async () => (await findObject(canvas, id)) === undefined, {
			message: "画面外の図形が DOM から外れること",
		})
		.toBe(true);

	await canvas.openContextMenu({ x: 700, y: 500 });
	await canvas.clickContextMenuItem("export");
	await expect(page.getByTestId("export-dialog")).toBeVisible();
	await page.getByTestId("export-dialog:format-svg").check();

	const downloadPromise = page.waitForEvent("download");
	await page.getByTestId("export-dialog:submit").click();
	const download = await downloadPromise;
	const chunks: Buffer[] = [];
	for await (const chunk of await download.createReadStream()) {
		chunks.push(chunk as Buffer);
	}
	const svgText = Buffer.concat(chunks).toString("utf-8");

	// fit-to-content のエクスポートに、DOM からカリング済みの図形が含まれること
	expect(svgText).toContain(`data-id="${id}"`);

	// エクスポート後はカリングが復帰している（画面外の図形は DOM に無いまま）
	await expect
		.poll(async () => (await findObject(canvas, id)) === undefined, {
			message: "エクスポート後もカリングが効いていること",
		})
		.toBe(true);
});
