import { test, expect, selectors } from "@jiscribe/canvas-sdk/testing/e2e";
import type { CanvasDriver } from "@jiscribe/canvas-sdk/testing/e2e";
import {
	ER_ENTITY_DEFAULT_NAME_WIDTH,
	ER_ENTITY_DEFAULT_TYPE_WIDTH,
} from "@jiscribe/plugin-er-shapes";

/**
 * Dragging a slot boundary, the right edge or a width handle of an entity, in a
 * real browser. What only a browser answers is whether the strip sits on the
 * boundary the slots are drawn at and whether the box comes out of the same tick
 * as the new slot widths — the arithmetic is pinned by
 * calcErEntitySlotBoundaryDrag's and reconcileErEntityBox's unit tests.
 */

const CATEGORY = "er";
const PRESET = "erEntity";

/** A rectangle in client pixels, as `getBoundingClientRect` reports it. */
type ClientRect = { x: number; y: number; width: number; height: number };

/** Where one slot's hit area is drawn, found by its `data-part`. */
async function slotRect(
	canvas: CanvasDriver,
	objectId: string,
	slotId: string,
): Promise<ClientRect> {
	return canvas.page.evaluate(
		([id, part]) => {
			const slot = document.querySelector(
				`[data-kind="object"][data-id="${id}"] [data-part="textSlot:${part}"]`,
			);
			if (slot === null) {
				throw new Error(`no slot ${part} on ${id}`);
			}
			const box = slot.getBoundingClientRect();
			return { x: box.x, y: box.y, width: box.width, height: box.height };
		},
		[objectId, slotId] as const,
	);
}

/** The first column's three slots, which span the box's width. */
async function firstRow(canvas: CanvasDriver, objectId: string) {
	return {
		key: await slotRect(canvas, objectId, "col:0:key"),
		name: await slotRect(canvas, objectId, "col:0:name"),
		type: await slotRect(canvas, objectId, "col:0:type"),
	};
}

/** The strip for one slot boundary, by the `data-action` its control gives it. */
const boundaryStrip = (canvas: CanvasDriver, boundaryIndex: number) =>
	canvas.page.locator(
		`[data-kind="control"][data-action="selection:erEntity:slotBoundary:${boundaryIndex}"]`,
	);

/** The strip down the entity's right edge, by the `data-action` its control gives it. */
const trailingEdgeStrip = (canvas: CanvasDriver) =>
	canvas.page.locator(
		`[data-kind="control"][data-action="selection:erEntity:trailingEdge"]`,
	);

/**
 * Drag the right edge by a client x offset at the height of the first row's
 * top, just under the title band and clear of the right width handle at the
 * edge's middle.
 */
async function dragRightEdge(
	canvas: CanvasDriver,
	objectId: string,
	byX: number,
): Promise<void> {
	const type = await slotRect(canvas, objectId, "col:0:type");
	await dragClient(
		canvas,
		{ x: type.x + type.width, y: type.y + 4 },
		{ x: byX, y: 0 },
	);
}

/**
 * Drag from one client point by a client offset, both converted into the
 * driver's content coordinates; `shift` holds Shift from before the press to
 * after the release.
 */
async function dragClient(
	canvas: CanvasDriver,
	from: { x: number; y: number },
	by: { x: number; y: number },
	shift = false,
): Promise<void> {
	if (shift) {
		await canvas.page.keyboard.down("Shift");
	}
	try {
		await canvas.drag(
			canvas.toContent(from),
			canvas.toContent({ x: from.x + by.x, y: from.y + by.y }),
		);
	} finally {
		if (shift) {
			await canvas.page.keyboard.up("Shift");
		}
	}
}

test.describe("erEntity placed from the stencil", () => {
	test("draws the name and the type at their default widths, the box not widened to fit", async ({
		canvas,
	}) => {
		const id = await canvas.placeShapeFromFlyout(CATEGORY, PRESET);
		await expect(trailingEdgeStrip(canvas)).toBeVisible();

		for (const columnIndex of [0, 1, 2]) {
			const name = await slotRect(canvas, id, `col:${columnIndex}:name`);
			const type = await slotRect(canvas, id, `col:${columnIndex}:type`);
			expect(name.width).toBeCloseTo(ER_ENTITY_DEFAULT_NAME_WIDTH, 0);
			expect(type.width).toBeCloseTo(ER_ENTITY_DEFAULT_TYPE_WIDTH, 0);
		}
	});
});

test.describe("erEntity slot boundary drag", () => {
	test("widens the key gutter and the box with it, the name and the drawn corner kept", async ({
		canvas,
	}) => {
		// Placed and left selected, which is when the strips are drawn.
		const id = await canvas.placeShapeFromFlyout(CATEGORY, PRESET);
		await expect(boundaryStrip(canvas, 0)).toBeVisible();
		await expect(boundaryStrip(canvas, 1)).toBeVisible();
		const before = await firstRow(canvas, id);

		await dragClient(
			canvas,
			{
				x: before.key.x + before.key.width,
				y: before.key.y + before.key.height / 2,
			},
			{ x: 30, y: 0 },
		);

		await expect
			.poll(async () =>
				Math.round((await slotRect(canvas, id, "col:0:key")).width),
			)
			.toBe(Math.round(before.key.width + 30));
		const after = await firstRow(canvas, id);
		expect(after.name.width).toBeCloseTo(before.name.width, 0);
		expect(after.type.width).toBeCloseTo(before.type.width, 0);
		expect(after.key.x).toBeCloseTo(before.key.x, 0);
		expect(after.key.y).toBeCloseTo(before.key.y, 0);
		expect(after.type.x + after.type.width).toBeCloseTo(
			before.type.x + before.type.width + 30,
			0,
		);
	});

	test("makes the key and the name trade with Shift held, the box width kept", async ({
		canvas,
	}) => {
		const id = await canvas.placeShapeFromFlyout(CATEGORY, PRESET);
		await expect(boundaryStrip(canvas, 0)).toBeVisible();
		const before = await firstRow(canvas, id);

		// Kept short of the name's floor (the width "created_at" needs), where the
		// trade stops.
		await dragClient(
			canvas,
			{
				x: before.key.x + before.key.width,
				y: before.key.y + before.key.height / 2,
			},
			{ x: 12, y: 0 },
			true,
		);

		await expect
			.poll(async () =>
				Math.round((await slotRect(canvas, id, "col:0:key")).width),
			)
			.toBe(Math.round(before.key.width + 12));
		const after = await firstRow(canvas, id);
		expect(after.name.width).toBeCloseTo(before.name.width - 12, 0);
		expect(after.type.width).toBeCloseTo(before.type.width, 0);
		expect(after.key.x).toBeCloseTo(before.key.x, 0);
		expect(after.type.x + after.type.width).toBeCloseTo(
			before.type.x + before.type.width,
			0,
		);
	});

	test("widens the name and the box with it on the name / type boundary, the type kept", async ({
		canvas,
	}) => {
		const id = await canvas.placeShapeFromFlyout(CATEGORY, PRESET);
		await expect(boundaryStrip(canvas, 1)).toBeVisible();
		const before = await firstRow(canvas, id);

		await dragClient(
			canvas,
			{ x: before.type.x, y: before.type.y + before.type.height / 2 },
			{ x: 40, y: 0 },
		);

		await expect
			.poll(async () =>
				Math.round((await slotRect(canvas, id, "col:0:name")).width),
			)
			.toBe(Math.round(before.name.width + 40));
		const after = await firstRow(canvas, id);
		expect(after.type.width).toBeCloseTo(before.type.width, 0);
		expect(after.key.width).toBeCloseTo(before.key.width, 0);
		expect(after.key.x).toBeCloseTo(before.key.x, 0);
		expect(after.type.x + after.type.width).toBeCloseTo(
			before.type.x + before.type.width + 40,
			0,
		);
	});

	test("widens the type and the box with it by the right edge, the key and the name kept", async ({
		canvas,
	}) => {
		const id = await canvas.placeShapeFromFlyout(CATEGORY, PRESET);
		await expect(trailingEdgeStrip(canvas)).toBeVisible();
		const before = await firstRow(canvas, id);

		await dragRightEdge(canvas, id, 40);

		await expect
			.poll(async () =>
				Math.round((await slotRect(canvas, id, "col:0:type")).width),
			)
			.toBe(Math.round(before.type.width + 40));
		const after = await firstRow(canvas, id);
		expect(after.name.width).toBeCloseTo(before.name.width, 0);
		expect(after.key.width).toBeCloseTo(before.key.width, 0);
		expect(after.key.x).toBeCloseTo(before.key.x, 0);
		expect(after.key.y).toBeCloseTo(before.key.y, 0);
		expect(after.type.x + after.type.width).toBeCloseTo(
			before.type.x + before.type.width + 40,
			0,
		);
	});

	test("splits a right width handle resize between the name and the type by their widths, the key kept", async ({
		canvas,
	}) => {
		const id = await canvas.placeShapeFromFlyout(CATEGORY, PRESET);
		await expect(trailingEdgeStrip(canvas)).toBeVisible();
		// Widening the type by the edge first makes the two uneven, so the split
		// shows.
		const startType = await slotRect(canvas, id, "col:0:type");
		await dragRightEdge(canvas, id, 40);
		await expect
			.poll(async () =>
				Math.round((await slotRect(canvas, id, "col:0:type")).width),
			)
			.toBe(Math.round(startType.width + 40));
		const before = await firstRow(canvas, id);
		const right = before.type.x + before.type.width;
		const typeShare =
			before.type.width / (before.name.width + before.type.width);
		const handle = await canvas.page
			.locator(selectors.transformControl("rightCenter"))
			.boundingBox();
		if (handle === null) {
			throw new Error("no right width handle");
		}

		// Ctrl keeps a snap target from moving the width that lands.
		await canvas.dragTransformHandle(
			"rightCenter",
			canvas.toContent({ x: right + 100, y: handle.y + handle.height / 2 }),
			{ ctrl: true },
		);

		await expect
			.poll(async () => {
				const type = await slotRect(canvas, id, "col:0:type");
				return Math.round(type.x + type.width);
			})
			.toBe(Math.round(right + 100));
		const after = await firstRow(canvas, id);
		expect(after.key.width).toBeCloseTo(before.key.width, 0);
		expect(after.key.x).toBeCloseTo(before.key.x, 0);
		// Each column takes its share of the 100 px, to the whole px the name is drawn at.
		expect(
			Math.abs(after.type.width - before.type.width - 100 * typeShare),
		).toBeLessThanOrEqual(1);
		expect(
			Math.abs(after.name.width - before.name.width - 100 * (1 - typeShare)),
		).toBeLessThanOrEqual(1);
	});

	test("stops a left width handle dragged past the minimum, the right edge kept", async ({
		canvas,
	}) => {
		const id = await canvas.placeShapeFromFlyout(CATEGORY, PRESET);
		await expect(trailingEdgeStrip(canvas)).toBeVisible();
		// Widened first, so the name and the type have room to give back.
		const placed = await firstRow(canvas, id);
		const placedRight = placed.type.x + placed.type.width;
		await canvas.dragTransformHandle(
			"rightCenter",
			canvas.toContent({
				x: placedRight + 120,
				y: placed.type.y + placed.type.height / 2,
			}),
			{ ctrl: true },
		);
		await expect
			.poll(async () => {
				const type = await slotRect(canvas, id, "col:0:type");
				return Math.round(type.x + type.width);
			})
			.toBe(Math.round(placedRight + 120));
		const before = await firstRow(canvas, id);
		const right = before.type.x + before.type.width;
		const handle = await canvas.page
			.locator(selectors.transformControl("leftCenter"))
			.boundingBox();
		if (handle === null) {
			throw new Error("no left width handle");
		}

		// Far past where the name and the type reach their floors.
		await canvas.dragTransformHandle(
			"leftCenter",
			canvas.toContent({ x: right - 20, y: handle.y + handle.height / 2 }),
			{ ctrl: true },
		);

		await expect
			.poll(async () => {
				const name = await slotRect(canvas, id, "col:0:name");
				return Math.round(name.width);
			})
			.toBeLessThan(Math.round(before.name.width));
		const after = await firstRow(canvas, id);
		expect(after.type.x + after.type.width).toBeCloseTo(right, 0);
		expect(after.key.width).toBeCloseTo(before.key.width, 0);
		// Stopped at the floors, no narrower than the stencil's texts fit at.
		expect(after.key.x).toBeLessThan(right - 100);
		expect(after.key.x).toBeGreaterThanOrEqual(placed.key.x - 1);
	});

	test("marks each boundary with a dashed guide while the entity is selected", async ({
		canvas,
	}) => {
		await canvas.placeShapeFromFlyout(CATEGORY, PRESET);
		for (const boundaryIndex of [0, 1]) {
			const guide = boundaryStrip(canvas, boundaryIndex).locator(
				"xpath=preceding-sibling::*[local-name()='line'][1]",
			);
			await expect(guide).toHaveCount(1);
			await expect(guide).toHaveAttribute("stroke-dasharray", /\S/);
		}
	});
});
