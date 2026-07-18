import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";
import { selectors } from "../../support/selectors";

/**
 * 単独のポリライン（コネクターではない線）の矢印（arrow head）設定。
 *
 * ポリラインの矢印は `polygon[data-kind=object][data-id=<id>]` として描かれ、既定では
 * 矢印を持たない（コネクターは終端に既定矢印を持つのと対照的）。矢印系メニューは
 * コネクターと共有だが、プレゼンテーションと既定値が異なる別経路のため個別に守る。
 */

/**
 * ポリライン id の矢印数。矢印は種別により polygon / polyline / circle と要素が変わるため
 * タグでは数えられない。矢印はいずれも transform 属性（matrix で端点へ配置）を持ち、
 * 当たり判定用ポリライン（data-kind=object・同 id・transform なし）は持たないので、
 * 「同 id かつ transform を持つ要素」を矢印として数える。
 */
async function arrowCount(canvas: CanvasDriver, id: string): Promise<number> {
	return canvas.page.evaluate(
		(targetId) =>
			[
				...document.querySelectorAll(
					`[data-kind="object"][data-id="${targetId}"]`,
				),
			].filter((el) => el.hasAttribute("transform")).length,
		id,
	);
}

/** 水平ポリラインを引いて id を返す（描画直後は選択済み） */
async function drawLine(canvas: CanvasDriver): Promise<string> {
	return canvas.drawShape("Polyline", { x: 300, y: 300 }, { x: 600, y: 300 });
}

test.describe("ポリラインの矢印", () => {
	test("既定では矢印を持たず、endArrow を設定すると終端に矢印が出る", async ({
		canvas,
	}) => {
		const id = await drawLine(canvas);
		expect(await arrowCount(canvas, id)).toBe(0);

		await canvas.openObjectMenu("arrow-head-end");
		await canvas.page.click(
			selectors.objectMenuSet("endArrow", "FilledTriangle"),
		);

		await expect.poll(() => arrowCount(canvas, id)).toBe(1);
	});

	test("startArrow も設定すると両端に矢印が並ぶ（2つ）", async ({ canvas }) => {
		const id = await drawLine(canvas);

		await canvas.openObjectMenu("arrow-head-end");
		await canvas.page.click(
			selectors.objectMenuSet("endArrow", "FilledTriangle"),
		);
		await expect.poll(() => arrowCount(canvas, id)).toBe(1);

		await canvas.openObjectMenu("arrow-head-start");
		await canvas.page.click(selectors.objectMenuSet("startArrow", "OpenArrow"));
		await expect.poll(() => arrowCount(canvas, id)).toBe(2);
	});

	test("endArrow の設定は undo で消え、redo で再適用される", async ({
		canvas,
	}) => {
		const id = await drawLine(canvas);
		expect(await arrowCount(canvas, id)).toBe(0);

		await canvas.openObjectMenu("arrow-head-end");
		await canvas.page.click(
			selectors.objectMenuSet("endArrow", "FilledTriangle"),
		);
		await expect.poll(() => arrowCount(canvas, id)).toBe(1);

		await canvas.undo();
		await expect.poll(() => arrowCount(canvas, id)).toBe(0);

		await canvas.redo();
		await expect.poll(() => arrowCount(canvas, id)).toBe(1);
	});
});
