import { test, expect } from "../../fixtures";
import { selectors } from "../../support/selectors";

/**
 * The selection controls are hidden for the duration of a drag, driven by the
 * `drag.kind` the handler names once per dragStart:
 *
 * - "move" hides both the transform frame and the connection anchors
 * - "transform" hides the anchors only — the handle being dragged has to stay
 *
 * A polyline's vertex and midpoint handles hide on both kinds as well, and stay
 * through a drag of one of them ("vertex").
 *
 * A type's own selection controls hide on both kinds too; this harness registers
 * no type that has any, so the table plugin's suite pins that
 * (table-controls-hidden-while-dragging).
 *
 * The ObjectMenu was already hidden for every drag; it is asserted here because
 * its gate moved from the drag's start snapshot onto the same field.
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
		const objectMenu = canvas.page.locator(selectors.objectMenu);

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

	test("hides a polyline's vertex and midpoint handles while it is moved", async ({
		canvas,
	}) => {
		// Horizontal polyline, selected by the draw; its midpoint handle sits at
		// (450,300), so the move is grabbed a quarter of the way along instead.
		const id = await canvas.drawShape(
			"Polyline",
			{ x: 300, y: 300 },
			{ x: 600, y: 300 },
		);
		const vertex = canvas.page.locator(
			`[data-id="${id}"][data-part="vertex:0"]`,
		);
		const midpoint = canvas.page.locator(
			`[data-id="${id}"][data-action="vertex-insert:0"]`,
		);
		await expect(vertex).toHaveCount(1);
		await expect(midpoint).toHaveCount(1);

		await canvas.dragInspecting(
			{ x: 375, y: 300 },
			{ x: 475, y: 400 },
			async () => {
				await expect(vertex).toHaveCount(0);
				await expect(midpoint).toHaveCount(0);
			},
		);

		await expect(vertex).toHaveCount(1);
		await expect(midpoint).toHaveCount(1);
	});

	test("keeps a polyline's handles while a vertex is dragged", async ({
		canvas,
	}) => {
		const id = await canvas.drawShape(
			"Polyline",
			{ x: 300, y: 300 },
			{ x: 600, y: 300 },
		);
		const otherVertex = canvas.page.locator(
			`[data-id="${id}"][data-part="vertex:0"]`,
		);
		const dragged = await canvas.page
			.locator(`[data-id="${id}"][data-part="vertex:1"]`)
			.boundingBox();
		if (dragged === null) {
			throw new Error("no vertex handle");
		}

		await canvas.dragInspecting(
			canvas.toContent({
				x: dragged.x + dragged.width / 2,
				y: dragged.y + dragged.height / 2,
			}),
			{ x: 600, y: 420 },
			async () => {
				await expect(otherVertex).toHaveCount(1);
			},
		);
	});
});
