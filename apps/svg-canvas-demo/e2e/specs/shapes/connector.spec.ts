import { test, expect } from "../fixtures";

test.describe("コネクター", () => {
	test("アンカードラッグで2つの図形を接続できる", async ({ canvas }) => {
		await canvas.drawShape("Rectangle", { x: 400, y: 150 }, { x: 600, y: 250 });
		await canvas.deselect();
		await canvas.drawShape("Rectangle", { x: 400, y: 450 }, { x: 600, y: 550 });
		await canvas.deselect();

		// 上の矩形を選択し、下辺アンカーから下の矩形の上辺中点へドラッグ
		await canvas.selectAt({ x: 500, y: 200 });
		const connectorId = await canvas.createConnector("bottomCenter", {
			x: 500,
			y: 450,
		});

		const created = (await canvas.captureObjects()).find(
			(obj) => obj.id === connectorId,
		);
		expect(created?.tag).toBe("polyline");
	});

	test("接続元の図形を動かすとコネクターが追従する", async ({ canvas }) => {
		await canvas.drawShape("Rectangle", { x: 400, y: 150 }, { x: 600, y: 250 });
		await canvas.deselect();
		await canvas.drawShape("Rectangle", { x: 400, y: 450 }, { x: 600, y: 550 });
		await canvas.deselect();

		await canvas.selectAt({ x: 500, y: 200 });
		const connectorId = await canvas.createConnector("bottomCenter", {
			x: 500,
			y: 450,
		});
		await canvas.deselect();

		const pointsBefore = await canvas
			.objectById(connectorId)
			.getAttribute("points");

		// 上の矩形を右へ移動
		await canvas.drag({ x: 500, y: 200 }, { x: 800, y: 200 });

		await expect
			.poll(async () => canvas.objectById(connectorId).getAttribute("points"))
			.not.toBe(pointsBefore);
	});

	test("作成直後のコネクターは選択されていない", async ({ canvas }) => {
		await canvas.drawShape("Rectangle", { x: 400, y: 150 }, { x: 600, y: 250 });
		await canvas.deselect();
		await canvas.drawShape("Rectangle", { x: 400, y: 450 }, { x: 600, y: 550 });
		await canvas.deselect();

		await canvas.selectAt({ x: 500, y: 200 });
		await canvas.createConnector("bottomCenter", { x: 500, y: 450 });

		// コネクター用の ObjectMenu（線色）が出ていない = 選択されていない
		await expect(
			canvas.page.locator('[data-id="object-menu:toggle:line-color"]'),
		).toHaveCount(0);
	});
});
