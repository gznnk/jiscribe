import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * 貼り付けオフセット（+20,+20）がワールド座標基準で、ビューポートのパンに依存しないことを守る。
 *
 * handlePaste は PASTE_OFFSET をワールド座標で適用する。もし誤って画面座標基準だと、パン後の
 * 貼り付けでクローンがパン分ずれてしまう。コピー → パン → 貼り付けの順で、クローンが
 * 元のワールド中心 +20,+20（= matrix の e,f）に置かれることを検証する。
 */

/** 全図形の transform 文字列一覧 */
async function transforms(canvas: CanvasDriver): Promise<(string | null)[]> {
	return (await canvas.captureObjects()).map((obj) => obj.transform);
}

test("貼り付けはパンしてもワールド座標で +20,+20 に配置される", async ({
	canvas,
}) => {
	// 中心 (500,260) の矩形を描いてコピー。
	await canvas.drawShape("Rectangle", { x: 400, y: 200 }, { x: 600, y: 320 });
	await canvas.copy();

	const viewBoxBefore = await canvas.getViewBox();

	// 右ドラッグでビューポートをパンする（viewBox が変わる）。
	await canvas.rightDrag({ x: 700, y: 700 }, { x: 480, y: 500 });
	await expect.poll(() => canvas.getViewBox()).not.toBe(viewBoxBefore);

	// パン後に貼り付け。
	await canvas.paste();
	await expect.poll(async () => (await canvas.captureObjects()).length).toBe(2);

	// 元はワールド (500,260) のまま、クローンはワールド (520,280)。パン量に依らない。
	const list = await transforms(canvas);
	expect(list).toContain("matrix(1, 0, 0, 1, 500, 260)");
	expect(list).toContain("matrix(1, 0, 0, 1, 520, 280)");
});
