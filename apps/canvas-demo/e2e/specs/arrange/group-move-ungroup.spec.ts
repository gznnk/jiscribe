import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * グループを「移動してから」解除したとき、移動分がメンバーのワールド座標へ正しく焼き込まれ、
 * 解除後も位置が保たれて個別に動かせることを守る。
 *
 * 既存の group.spec は「グループ移動」と「移動せず解除→個別移動」は見るが、
 * 「移動 → 解除」でグループ変換がメンバーへ合成（baking）される経路は未カバーだった。
 */

/** 2 矩形を描き、マーキーで囲ってグループ化する（A 中心 370,260 / B 中心 630,260） */
async function groupTwoRects(
	canvas: CanvasDriver,
): Promise<{ a: string; b: string }> {
	const a = await canvas.drawShape(
		"Rectangle",
		{ x: 300, y: 200 },
		{ x: 440, y: 320 },
	);
	await canvas.deselect();
	const b = await canvas.drawShape(
		"Rectangle",
		{ x: 560, y: 200 },
		{ x: 700, y: 320 },
	);
	await canvas.deselect();

	await canvas.drag({ x: 260, y: 160 }, { x: 740, y: 360 }, 12);
	await canvas.group();
	return { a, b };
}

test("グループを移動してから解除しても位置が保たれ、以後は個別に動く", async ({
	canvas,
}) => {
	const { a, b } = await groupTwoRects(canvas);

	// グループ全体を +100,+40 移動する。
	await canvas.deselect();
	await canvas.selectAt({ x: 370, y: 260 });
	await canvas.drag({ x: 370, y: 260 }, { x: 470, y: 300 });
	await expect
		.poll(() => canvas.objectById(a).getAttribute("transform"))
		.toBe("matrix(1, 0, 0, 1, 470, 300)");
	expect(await canvas.objectById(b).getAttribute("transform")).toBe(
		"matrix(1, 0, 0, 1, 730, 300)",
	);

	// 解除しても、移動後のワールド座標がメンバーへ焼き込まれて保たれる。
	await canvas.ungroup();
	expect(await canvas.objectById(a).getAttribute("transform")).toBe(
		"matrix(1, 0, 0, 1, 470, 300)",
	);
	expect(await canvas.objectById(b).getAttribute("transform")).toBe(
		"matrix(1, 0, 0, 1, 730, 300)",
	);

	// 解除後は個別に動く（A を動かしても B は不動）。
	await canvas.deselect();
	await canvas.selectAt({ x: 470, y: 300 });
	await canvas.drag({ x: 470, y: 300 }, { x: 570, y: 300 });
	await expect
		.poll(() => canvas.objectById(a).getAttribute("transform"))
		.toBe("matrix(1, 0, 0, 1, 570, 300)");
	expect(await canvas.objectById(b).getAttribute("transform")).toBe(
		"matrix(1, 0, 0, 1, 730, 300)",
	);
});
