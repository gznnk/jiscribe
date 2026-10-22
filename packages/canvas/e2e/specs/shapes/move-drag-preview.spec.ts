import { test, expect } from "../../fixtures";

/**
 * Pins the render-only shortcut a move drag takes (MovePreview): while the
 * pointer is held, the dragged shape keeps its own element, drawn from where the
 * drag started, and the per-object wrapper `<g>` around it carries the shift.
 * The drop draws the moved state itself and leaves the wrapper unshifted.
 *
 * The node identity is what the shortcut is for — a re-rendered or remounted
 * shape would pass every position check — so the element is tagged before the
 * drag and looked for again on every frame. At zoom 1 with nothing to snap to,
 * the world delta is exactly the pointer's.
 */

type DrawnShape = {
	/** Whether the shape's element is still the node tagged before the drag. */
	isSameNode: boolean;
	/** The shape element's own transform. */
	transform: string | null;
	/** The transform of the wrapper `<g>` around it, null when unshifted. */
	wrapperTransform: string | null;
	/** The shape's on-screen center, x. */
	centerX: number;
	/** The shape's on-screen center, y. */
	centerY: number;
};

test.describe("move drag preview", () => {
	test("shifts the dragged shape's wrapper frame by frame and draws the moved state on drop", async ({
		canvas,
	}) => {
		// Centered at (370,260)
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 300, y: 200 },
			{ x: 440, y: 320 },
		);
		await canvas.deselect();
		const startTransform = "matrix(1, 0, 0, 1, 370, 260)";
		await expect(canvas.objectById(id)).toHaveAttribute(
			"transform",
			startTransform,
		);
		await canvas.objectById(id).evaluate((element) => {
			(window as unknown as { draggedNode: Element }).draggedNode = element;
		});

		const readDrawn = () =>
			canvas.page.evaluate((targetId): DrawnShape => {
				const element = document.querySelector(
					`[data-kind="object"][data-id="${targetId}"]`,
				);
				if (element === null) {
					throw new Error(`shape ${targetId} is not drawn`);
				}
				const box = element.getBoundingClientRect();
				return {
					isSameNode:
						element ===
						(window as unknown as { draggedNode: Element }).draggedNode,
					transform: element.getAttribute("transform"),
					wrapperTransform:
						element
							.closest('g[data-canvas-export="flatten"]')
							?.getAttribute("transform") ?? null,
					centerX: box.x + box.width / 2,
					centerY: box.y + box.height / 2,
				};
			}, id);

		const startDrawn = await readDrawn();
		expect(startDrawn.wrapperTransform).toBeNull();

		const grab = canvas.toScreen({ x: 370, y: 260 });
		await canvas.page.mouse.move(grab.x, grab.y);
		await canvas.page.mouse.down();
		try {
			for (const delta of [
				{ x: 40, y: 10 },
				{ x: 90, y: 55 },
			]) {
				await canvas.page.mouse.move(grab.x + delta.x, grab.y + delta.y, {
					steps: 4,
				});
				await expect
					.poll(async () => (await readDrawn()).wrapperTransform, {
						message: `the wrapper carries the drag's shift of (${delta.x}, ${delta.y})`,
					})
					.toBe(`translate(${delta.x} ${delta.y})`);
				const drawn = await readDrawn();
				expect(drawn.isSameNode).toBe(true);
				expect(drawn.transform).toBe(startTransform);
				expect(drawn.centerX).toBeCloseTo(startDrawn.centerX + delta.x, 0);
				expect(drawn.centerY).toBeCloseTo(startDrawn.centerY + delta.y, 0);
			}
		} finally {
			await canvas.page.mouse.up();
		}

		await expect
			.poll(async () => (await readDrawn()).transform, {
				message: "the drop draws the moved state",
			})
			.toBe("matrix(1, 0, 0, 1, 460, 315)");
		const droppedDrawn = await readDrawn();
		expect(droppedDrawn.wrapperTransform).toBeNull();
		expect(droppedDrawn.isSameNode).toBe(true);
		expect(droppedDrawn.centerX).toBeCloseTo(startDrawn.centerX + 90, 0);
		expect(droppedDrawn.centerY).toBeCloseTo(startDrawn.centerY + 55, 0);
	});

	test("shifts a connector between two dragged shapes with its route as drawn at the start, and routes it on drop", async ({
		canvas,
	}) => {
		// A centered at (270,200), B at (670,450); the connector runs from A's
		// right edge to B's left edge, routed orthogonally by default.
		await canvas.drawShape("Rectangle", { x: 200, y: 150 }, { x: 340, y: 250 });
		await canvas.deselect();
		await canvas.drawShape("Rectangle", { x: 600, y: 400 }, { x: 740, y: 500 });
		await canvas.deselect();
		await canvas.selectAt({ x: 270, y: 200 });
		const connectorId = await canvas.createConnector("rightCenter", {
			x: 600,
			y: 450,
		});
		await canvas.deselect();
		await canvas.selectAt({ x: 270, y: 200 });
		await canvas.shiftClickAt({ x: 670, y: 450 });

		/** The connector's own `points` attribute and its wrapper's transform, as written. */
		const readConnectorAttributes = () =>
			canvas.page.evaluate((targetId) => {
				const line = document.querySelector(
					`polyline[data-kind="connector"][data-id="${targetId}"]`,
				);
				return {
					points: line?.getAttribute("points") ?? null,
					wrapperTransform:
						line
							?.closest('g[data-canvas-export="flatten"]')
							?.getAttribute("transform") ?? null,
				};
			}, connectorId);

		const start = await readConnectorAttributes();
		expect(start.wrapperTransform).toBeNull();
		const startPoints = await canvas.connectorPoints(connectorId);
		const delta = { x: 60, y: 40 };
		const shifted = startPoints.map((point) => ({
			x: point.x + delta.x,
			y: point.y + delta.y,
		}));

		await canvas.dragInspecting(
			{ x: 270, y: 200 },
			{ x: 270 + delta.x, y: 200 + delta.y },
			async () => {
				await expect
					.poll(async () => (await readConnectorAttributes()).wrapperTransform)
					.toBe(`translate(${delta.x} ${delta.y})`);
				expect((await readConnectorAttributes()).points).toBe(start.points);
				// The kit reads the drawn path, wrapper included.
				expect(await canvas.connectorPoints(connectorId)).toEqual(shifted);
			},
		);

		await expect
			.poll(async () => (await readConnectorAttributes()).wrapperTransform, {
				message: "the drop leaves the wrapper unshifted",
			})
			.toBeNull();
		expect(await canvas.connectorPoints(connectorId)).toEqual(shifted);
	});
});
