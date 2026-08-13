import { test, expect } from "../../fixtures";

test.describe("shape drawing", () => {
	test("creates a rect element for Rectangle", async ({ canvas }) => {
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 200 },
			{ x: 600, y: 320 },
		);
		const created = (await canvas.captureObjects()).find(
			(obj) => obj.id === id,
		);
		expect(created?.tag).toBe("rect");
		// e,f of the transform are the shape's center
		expect(created?.transform).toBe("matrix(1, 0, 0, 1, 500, 260)");
	});

	test("creates an ellipse element for Ellipse", async ({ canvas }) => {
		const id = await canvas.drawShape(
			"Ellipse",
			{ x: 400, y: 200 },
			{ x: 600, y: 320 },
		);
		const created = (await canvas.captureObjects()).find(
			(obj) => obj.id === id,
		);
		expect(created?.tag).toBe("ellipse");
	});

	test("creates a line from a drag for Polyline", async ({ canvas }) => {
		const id = await canvas.drawShape(
			"Polyline",
			{ x: 400, y: 400 },
			{ x: 700, y: 450 },
		);
		const created = (await canvas.captureObjects()).find(
			(obj) => obj.id === id,
		);
		expect(created?.tag).toBe("polyline");
	});

	test("creates a polygon element from a drag for Polygon", async ({
		canvas,
	}) => {
		// Polygon supports Draw mode too and is fitted into the dragged region
		const id = await canvas.drawShape(
			"Polygon",
			{ x: 400, y: 200 },
			{ x: 600, y: 320 },
		);
		const created = (await canvas.captureObjects()).find(
			(obj) => obj.id === id,
		);
		expect(created?.tag).toBe("polygon");
	});

	test("moves a shape by dragging it", async ({ canvas }) => {
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 200 },
			{ x: 600, y: 320 },
		);
		await canvas.deselect();

		await canvas.drag({ x: 500, y: 260 }, { x: 800, y: 560 });

		await expect
			.poll(async () => {
				const moved = (await canvas.captureObjects()).find(
					(obj) => obj.id === id,
				);
				return moved?.transform;
			})
			.toBe("matrix(1, 0, 0, 1, 800, 560)");
	});

	test("does not pan or zoom the canvas while drawing", async ({ canvas }) => {
		const initialViewBox = await canvas.getViewBox();
		await canvas.drawShape("Rectangle", { x: 200, y: 200 }, { x: 500, y: 400 });
		await canvas.deselect();
		expect(await canvas.getViewBox()).toBe(initialViewBox);
	});
});
