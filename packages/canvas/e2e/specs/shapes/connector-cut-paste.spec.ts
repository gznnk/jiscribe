import { test, expect } from "../../fixtures";

/**
 * Endpoint remapping when a connector is cut and pasted together with the shapes it connects.
 *
 * Cut (Ctrl+X puts everything on the clipboard and deletes it immediately) and paste is a flow
 * of its own (see connector-copy-paste for copy and duplicate). The original shapes are gone, so
 * if the pasted connector comes back with its endpoints still pointing at the deleted IDs it
 * connects to nothing and never follows a move. Moving a pasted shape and watching the connector
 * follow is what shows the endpoints were remapped to the new shapes.
 */

/** Extracts the center coordinates (e,f) from transform="matrix(a,b,c,d,e,f)" */
function centerOf(transform: string | null): { x: number; y: number } {
	const nums = transform?.match(/-?\d+(?:\.\d+)?/g)?.map(Number);
	if (!nums || nums.length < 6) {
		throw new Error(`cannot parse transform: ${transform}`);
	}
	return { x: nums[4], y: nums[5] };
}

test.describe("cutting and pasting a connector with its connected shapes (endpoint remapping)", () => {
	test("attaches a cut-and-pasted connector to the restored shapes so it follows their moves", async ({
		canvas,
	}) => {
		// Join a rectangle centered at (500,200) to one at (500,450) with a vertical connector.
		await canvas.drawShape("Rectangle", { x: 400, y: 150 }, { x: 600, y: 250 });
		await canvas.deselect();
		await canvas.drawShape("Rectangle", { x: 400, y: 400 }, { x: 600, y: 500 });
		await canvas.deselect();
		await canvas.selectAt({ x: 500, y: 200 });
		await canvas.createConnector("bottomCenter", { x: 500, y: 400 });
		await canvas.deselect();

		await canvas.selectAll();
		await canvas.cut();
		await expect
			.poll(async () => (await canvas.captureObjects()).length, {
				message: "cutting removes every shape and connector",
			})
			.toBe(0);

		await canvas.paste();
		await expect
			.poll(async () => (await canvas.captureObjects()).length, {
				message: "pasting restores all 3 objects",
			})
			.toBe(3);

		const objects = await canvas.captureObjects();
		const connector = objects.find((o) => o.tag === "polyline");
		const rects = objects.filter((o) => o.tag === "rect");
		expect(rects.length).toBe(2);
		if (!connector?.id) {
			throw new Error("cannot find the pasted connector");
		}

		// Pick the upper rectangle (the smaller center y) and drag it far right from its center.
		const topRect = rects.reduce((upper, cur) =>
			centerOf(cur.transform).y < centerOf(upper.transform).y ? cur : upper,
		);
		const topCenter = centerOf(topRect.transform);

		const pointsBefore = await canvas
			.objectById(connector.id)
			.getAttribute("points");

		await canvas.deselect();
		await canvas.drag(topCenter, { x: topCenter.x + 250, y: topCenter.y });

		await expect
			.poll(() => canvas.objectById(connector.id!).getAttribute("points"), {
				message: "the pasted connector follows the restored shape's move",
			})
			.not.toBe(pointsBefore);
	});
});
