/**
 * シナリオ: 画面遷移図を組み立てる。
 *
 * 一覧 → 詳細 → 編集 の3画面を縦に並べ、遷移を矢印で繋ぐ。
 * ワイヤーフレーム・アーキテクチャ図と同じ部品（箱＋コネクター）の組み合わせで、
 * 別ジャンルの図も同じ操作セットから組み上がることを示す。
 */

import { connectShapes, placeLabeledShape, type Rect } from "./buildDiagram";
import { test, expect } from "../../fixtures";

test.describe("シナリオ: 画面遷移図", () => {
	test("一覧→詳細→編集の遷移図を組み立てられる", async ({ canvas }) => {
		const list: Rect = { x: 200, y: 120, width: 240, height: 100 };
		const detail: Rect = { x: 200, y: 360, width: 240, height: 100 };
		const edit: Rect = { x: 200, y: 600, width: 240, height: 100 };

		await placeLabeledShape(canvas, {
			tool: "Rectangle",
			rect: list,
			label: "List",
		});
		await placeLabeledShape(canvas, {
			tool: "Rectangle",
			rect: detail,
			label: "Detail",
		});
		await placeLabeledShape(canvas, {
			tool: "Rectangle",
			rect: edit,
			label: "Edit",
		});

		await connectShapes(canvas, list, "bottomCenter", detail);
		await connectShapes(canvas, detail, "bottomCenter", edit);
		await canvas.deselect();

		// 構成: 画面 3 つ + 遷移 2 本
		const objects = await canvas.captureObjects();
		expect(objects.filter((obj) => obj.tag === "rect")).toHaveLength(3);
		expect(objects.filter((obj) => obj.tag === "polyline")).toHaveLength(2);

		const body = canvas.page.locator("body");
		for (const screen of ["List", "Detail", "Edit"]) {
			await expect(body).toContainText(screen);
		}
	});
});
