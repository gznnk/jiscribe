import { test, expect } from "@jiscribe/canvas-sdk/testing/e2e";

/**
 * The actor's limbs are too thin to grab, so the whole box answers a press
 * instead (Actor.tsx): a press beside the figure, where nothing is painted,
 * still takes the actor. Only hit testing in a browser can show that the box
 * is the pressable layer and the figure drawn over it does not get in the way.
 */

/** Box the stick figure fills: the head sits on the top edge at x = 440. */
const FIGURE_FROM = { x: 400, y: 200 };
const FIGURE_TO = { x: 480, y: 300 };

/** Inside the box's top-left corner, clear of the head (x = 426..454) and the arms (y = 236). */
const BESIDE_FIGURE = { x: 405, y: 205 };

test.describe("actor hit area", () => {
	test("selects the actor by a press beside the figure, inside its box", async ({
		canvas,
	}) => {
		await canvas.drawShapeFromFlyout(
			"general",
			"actor",
			FIGURE_FROM,
			FIGURE_TO,
		);
		await canvas.deselect();

		// Waits for the selection's controls, so a press reaching nothing fails here.
		await canvas.selectAt(BESIDE_FIGURE);
	});

	test("moves the actor by a drag started beside the figure", async ({
		canvas,
	}) => {
		const id = await canvas.drawShapeFromFlyout(
			"general",
			"actor",
			FIGURE_FROM,
			FIGURE_TO,
		);
		await canvas.deselect();
		const before = await canvas.objectById(id).boundingBox();

		await canvas.drag(BESIDE_FIGURE, {
			x: BESIDE_FIGURE.x + 60,
			y: BESIDE_FIGURE.y + 40,
		});

		await expect
			.poll(async () => (await canvas.objectById(id).boundingBox())?.x)
			.toBeCloseTo(before!.x + 60, 0);
		const after = await canvas.objectById(id).boundingBox();
		expect(after!.y).toBeCloseTo(before!.y + 40, 0);
	});
});
