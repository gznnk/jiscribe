import { test, expect } from "../../fixtures";
import { selectors } from "../../support/selectors";

/**
 * The selection controls are hidden for the duration of a drag, driven by the
 * `activeDragKind` the gesture router resolves once per dragStart:
 *
 * - "move" hides both the transform frame and the connection anchors
 * - "transform" hides the anchors only — the handle being dragged has to stay
 *
 * The ObjectMenu was already hidden for every drag; it is asserted here because
 * its gate moved from `eventStartSnapshot` onto the same field.
 */
test.describe("selection controls hidden while dragging", () => {
	test("hides the transform frame, anchors and ObjectMenu while a shape is moved", async ({
		canvas,
	}) => {
		// 200 x 120 rect centered at (500,260), left selected by the draw.
		await canvas.drawShape("Rectangle", { x: 400, y: 200 }, { x: 600, y: 320 });

		const transformHandle = canvas.page.locator(
			selectors.transformControl("topLeft"),
		);
		const anchor = canvas.page.locator(selectors.createAnchor("topCenter"));
		const objectMenu = canvas.page.locator('[data-id="object-menu"]');

		await expect(transformHandle).toHaveCount(1);
		await expect(anchor).toHaveCount(1);
		await expect(objectMenu.first()).toBeVisible();

		await canvas.dragInspecting(
			{ x: 500, y: 260 },
			{ x: 700, y: 500 },
			async () => {
				await expect(transformHandle).toHaveCount(0);
				await expect(anchor).toHaveCount(0);
				await expect(objectMenu).toHaveCount(0);
			},
		);

		// All three come back on release, with the selection kept.
		await expect(transformHandle).toHaveCount(1);
		await expect(anchor).toHaveCount(1);
		await expect(objectMenu.first()).toBeVisible();
	});

	test("keeps the transform frame but hides the anchors while a shape is resized", async ({
		canvas,
	}) => {
		await canvas.drawShape("Rectangle", { x: 400, y: 200 }, { x: 600, y: 320 });

		const draggedHandle = canvas.page.locator(
			selectors.transformControl("bottomRight"),
		);
		const oppositeHandle = canvas.page.locator(
			selectors.transformControl("topLeft"),
		);
		const anchor = canvas.page.locator(selectors.createAnchor("topCenter"));

		await expect(anchor).toHaveCount(1);

		await canvas.dragTransformHandle(
			"bottomRight",
			{ x: 700, y: 400 },
			{
				inspect: async () => {
					await expect(anchor).toHaveCount(0);
					await expect(draggedHandle).toHaveCount(1);
					await expect(oppositeHandle).toHaveCount(1);
				},
			},
		);

		await expect(anchor).toHaveCount(1);
	});
});
