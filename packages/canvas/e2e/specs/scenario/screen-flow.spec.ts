/**
 * Scenario: assemble a screen-flow diagram.
 *
 * Three screens — list, detail, edit — stacked vertically and joined by arrows.
 * They use the same parts as the wireframe and architecture diagrams (boxes plus
 * connectors), showing that another genre of diagram comes out of the same set
 * of operations.
 */

import { connectShapes, placeLabeledShape, type Rect } from "./buildDiagram";
import { test, expect } from "../../fixtures";

test.describe("scenario: screen-flow diagram", () => {
	test("assembles a list -> detail -> edit flow diagram", async ({
		canvas,
	}) => {
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

		// Makeup: 3 screens plus 2 transitions.
		const objects = await canvas.captureObjects();
		expect(objects.filter((obj) => obj.tag === "rect")).toHaveLength(3);
		expect(objects.filter((obj) => obj.tag === "polyline")).toHaveLength(2);

		const body = canvas.page.locator("body");
		for (const screen of ["List", "Detail", "Edit"]) {
			await expect(body).toContainText(screen);
		}
	});
});
