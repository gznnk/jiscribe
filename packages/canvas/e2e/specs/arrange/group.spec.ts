import { test, expect } from "../../fixtures";

/**
 * グループ化（Ctrl+G）/ 解除（Ctrl+Shift+G）。
 * グループ化後はメンバーをクリックするとグループ全体が選択され、まとめて動く
 * （autoSelectParentGroups）。解除後は個別に動く。
 */
test.describe("グループ", () => {
	test("グループ化するとメンバーをまとめて移動できる", async ({ canvas }) => {
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

		// マーキーで両方選択してグループ化
		await canvas.drag({ x: 260, y: 160 }, { x: 740, y: 360 }, 12);
		await canvas.group();
		await canvas.deselect();

		// A をクリックするとグループ全体が選択され、ドラッグで両方動く
		await canvas.selectAt({ x: 370, y: 260 });
		await canvas.drag({ x: 370, y: 260 }, { x: 470, y: 300 });

		// 両方が同じ量 (+100, +40) だけ移動する
		await expect
			.poll(() => canvas.objectById(a).getAttribute("transform"))
			.toBe("matrix(1, 0, 0, 1, 470, 300)");
		expect(await canvas.objectById(b).getAttribute("transform")).toBe(
			"matrix(1, 0, 0, 1, 730, 300)",
		);
	});

	test("グループ解除後は個別に移動できる", async ({ canvas }) => {
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
		await canvas.ungroup();
		await canvas.deselect();

		// A だけをクリック・移動しても B は動かない
		await canvas.selectAt({ x: 370, y: 260 });
		await canvas.drag({ x: 370, y: 260 }, { x: 470, y: 260 });

		await expect
			.poll(() => canvas.objectById(a).getAttribute("transform"))
			.toBe("matrix(1, 0, 0, 1, 470, 260)");
		expect(await canvas.objectById(b).getAttribute("transform")).toBe(
			"matrix(1, 0, 0, 1, 630, 260)",
		);
	});
});
