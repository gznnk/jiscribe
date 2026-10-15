import { test, expect, selectors } from "@jiscribe/canvas-sdk/testing/e2e";
import type { CanvasDriver } from "@jiscribe/canvas-sdk/testing/e2e";

/**
 * Stepping a record's slot pick with the bare arrows, in a real browser. Where the
 * step lands is pinned by selectAdjacentRecordSlot.test; what a browser answers is
 * that the keystroke reaches the record's command at all — the built-in nudge
 * claims the same bare arrows, and only the precedence a contributed command gets
 * in the key dispatch keeps the record from moving instead.
 *
 * Coordinate note: the interface stencil drawn at 220x100 stacks a 28px
 * stereotype band (content y=[200,228]), a 28px title band (y=[228,256]) and the
 * operations compartment (y=[256,300]); it has no attributes compartment.
 */

const CATEGORY = "uml";

const RECORD_FROM = { x: 300, y: 200 };
const RECORD_TO = { x: 520, y: 300 };
/** Inside the title band. */
const NAME_SPOT = { x: 410, y: 242 };
/** Inside the operations compartment. */
const OPERATIONS_SPOT = { x: 410, y: 280 };

/** Draws an interface record and leaves its title band picked as a slot. */
async function createRecordWithNamePicked(
	canvas: CanvasDriver,
): Promise<string> {
	const id = await canvas.drawShapeFromFlyout(
		CATEGORY,
		"interface",
		RECORD_FROM,
		RECORD_TO,
	);
	await canvas.deselect();
	// Two different spots, so the pair is not read as a double click.
	await canvas.selectAt(OPERATIONS_SPOT);
	await canvas.clickAt(NAME_SPOT);
	await expect
		.poll(() => canvas.selectionOutlineKinds(), {
			message: "the slot outline replaces the object outline",
		})
		.toEqual(["part"]);
	return id;
}

/**
 * The slot id of every compartment the selection outlines. Read off the
 * `data-part` address (`textSlot:<slotId>`) of the compartment whose rect the
 * outline matches; the outline itself carries no slot id.
 */
async function selectedSlotIds(
	canvas: CanvasDriver,
	id: string,
): Promise<string[]> {
	return canvas.page.evaluate(
		({ objectId, partOutlineSelector }) => {
			const outlines = [...document.querySelectorAll(partOutlineSelector)];
			const compartments = [
				...document.querySelectorAll(
					`[data-kind="object"][data-id="${objectId}"] [data-part]`,
				),
			];
			return outlines.map((outline) => {
				const matched = compartments.find(
					(compartment) =>
						compartment.getAttribute("y") === outline.getAttribute("y") &&
						compartment.getAttribute("height") ===
							outline.getAttribute("height"),
				);
				const address = matched?.getAttribute("data-part") ?? "";
				return address.startsWith("textSlot:")
					? address.slice("textSlot:".length)
					: "";
			});
		},
		{ objectId: id, partOutlineSelector: selectors.partOutline },
	);
}

test.describe("record slot arrow navigation", () => {
	test("moves the picked slot up and down, skipping the absent compartment", async ({
		canvas,
	}) => {
		const id = await createRecordWithNamePicked(canvas);
		const before = await canvas.objectById(id).boundingBox();

		await canvas.page.keyboard.press("ArrowUp");
		await expect
			.poll(() => selectedSlotIds(canvas, id))
			.toEqual(["stereotype"]);
		await canvas.page.keyboard.press("ArrowDown");
		await expect.poll(() => selectedSlotIds(canvas, id)).toEqual(["name"]);
		// No attributes compartment, so the step lands on operations.
		await canvas.page.keyboard.press("ArrowDown");
		await expect
			.poll(() => selectedSlotIds(canvas, id))
			.toEqual(["operations"]);

		expect(await canvas.objectById(id).boundingBox()).toEqual(before);
	});

	test("does nothing at the top and bottom slot rather than nudging the record", async ({
		canvas,
	}) => {
		const id = await createRecordWithNamePicked(canvas);
		const before = await canvas.objectById(id).boundingBox();

		await canvas.page.keyboard.press("ArrowUp");
		await canvas.page.keyboard.press("ArrowUp");
		// Shortcuts run synchronously on keydown; a step to name afterwards proves
		// both earlier keys were handled before it is read.
		await canvas.page.keyboard.press("ArrowDown");
		await expect.poll(() => selectedSlotIds(canvas, id)).toEqual(["name"]);

		await canvas.page.keyboard.press("ArrowDown");
		await canvas.page.keyboard.press("ArrowDown");
		await canvas.page.keyboard.press("ArrowUp");
		await expect.poll(() => selectedSlotIds(canvas, id)).toEqual(["name"]);

		expect(await canvas.objectById(id).boundingBox()).toEqual(before);
	});

	test("leaves the record and the pick where they are on left and right", async ({
		canvas,
	}) => {
		const id = await createRecordWithNamePicked(canvas);
		const before = await canvas.objectById(id).boundingBox();

		await canvas.page.keyboard.press("ArrowLeft");
		await canvas.page.keyboard.press("ArrowRight");
		// A step afterwards proves both sideways keys were handled before it is read.
		await canvas.page.keyboard.press("ArrowUp");
		await expect
			.poll(() => selectedSlotIds(canvas, id))
			.toEqual(["stereotype"]);

		expect(await canvas.objectById(id).boundingBox()).toEqual(before);
	});

	test("still nudges a record selected as a whole", async ({ canvas }) => {
		const id = await canvas.drawShapeFromFlyout(
			CATEGORY,
			"interface",
			RECORD_FROM,
			RECORD_TO,
		);
		await canvas.deselect();
		await canvas.selectAt(OPERATIONS_SPOT);
		const before = await canvas.objectById(id).boundingBox();
		expect(before).not.toBeNull();

		await canvas.page.keyboard.press("ArrowRight");

		await expect
			.poll(
				async () =>
					(await canvas.objectById(id).boundingBox())?.x ??
					Number.NEGATIVE_INFINITY,
			)
			.toBeGreaterThan(before?.x ?? Number.POSITIVE_INFINITY);
	});
});
