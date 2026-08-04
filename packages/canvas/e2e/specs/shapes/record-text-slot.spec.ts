import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * Selecting one text slot inside a multi-slot shape, one level below the object.
 * record is the type that has several, so it is the vehicle here. Guarded behavior:
 * - clicking a compartment of the already-selected record selects that slot, and
 *   the slot's own outline is drawn on top of the object's
 * - a style change then lands on that slot alone, leaving the others as they were
 * - Escape steps out one level at a time: the slot first, the object next
 * - Tab walks the slots in order and wraps around
 * - Enter opens the selected slot for editing
 *
 * Coordinate note (shared with record.spec): created at 220x80, an empty title
 * band is the top 28px (content y=[200,228]) and the row compartment sits below
 * it (y=[228,280]).
 */

const CATEGORY = "uml";

const RECORD_FROM = { x: 300, y: 200 };
const RECORD_TO = { x: 520, y: 280 };
/** Inside the title band (within 28px of the top edge). */
const NAME_SPOT = { x: 410, y: 212 };
/** Inside the row compartment (below the title band). */
const ATTRIBUTES_SPOT = { x: 410, y: 255 };

const NAME_TEXT = "User";
const ATTRIBUTES_TEXT = "id: string";

/**
 * Creates an entity with both slots filled in and nothing selected, so each test
 * starts from the same committed content.
 */
async function createFilledRecord(canvas: CanvasDriver): Promise<string> {
	const id = await canvas.drawShapeFromFlyout(
		CATEGORY,
		"entity",
		RECORD_FROM,
		RECORD_TO,
	);
	await canvas.deselect();
	await canvas.typeTextAt(NAME_SPOT, NAME_TEXT);
	await canvas.commitText();
	await canvas.typeTextAt(ATTRIBUTES_SPOT, ATTRIBUTES_TEXT);
	await canvas.commitText();
	return id;
}

/**
 * The `height` attribute of every outline rect in the selection overlay: the
 * object's own outline first, the selected slot's (if any) last. Read as
 * attributes rather than by visibility, since an outline is a fill-less rect.
 */
async function selectionOutlineHeights(
	canvas: CanvasDriver,
): Promise<number[]> {
	return canvas.page.evaluate(() =>
		[...document.querySelectorAll('[data-layer="selection-overlay"] rect')].map(
			(rect) => Number(rect.getAttribute("height")),
		),
	);
}

/** Computed text color of each drawn text overlay, keyed by the text it holds. */
async function textColorByContent(
	canvas: CanvasDriver,
): Promise<Record<string, string>> {
	return canvas.page.evaluate(() => {
		const colors: Record<string, string> = {};
		// foreignObject > wrapper > content is the text overlay's DOM contract.
		for (const frame of document.querySelectorAll("foreignObject")) {
			const content = frame.firstElementChild?.firstElementChild;
			if (!(content instanceof HTMLElement)) {
				continue;
			}
			const label = content.textContent ?? "";
			if (label !== "") {
				colors[label] = getComputedStyle(content).color;
			}
		}
		return colors;
	});
}

/** Selects the record, then its title band as a slot (two different spots, so no dblclick). */
async function selectNameSlot(canvas: CanvasDriver): Promise<void> {
	await canvas.selectAt(ATTRIBUTES_SPOT);
	await canvas.clickAt(NAME_SPOT);
	await expect
		.poll(async () => (await selectionOutlineHeights(canvas)).length, {
			message: "the slot outline joins the object outline",
		})
		.toBe(2);
}

test.describe("record: selecting one text slot", () => {
	test("selects the clicked compartment as a slot of the already-selected record", async ({
		canvas,
	}) => {
		await createFilledRecord(canvas);

		// The first click only selects the object, so there is one outline.
		await canvas.selectAt(ATTRIBUTES_SPOT);
		expect(await selectionOutlineHeights(canvas)).toHaveLength(1);

		await canvas.clickAt(NAME_SPOT);
		await expect
			.poll(async () => (await selectionOutlineHeights(canvas)).length)
			.toBe(2);
	});

	test("applies a font color to the selected slot alone", async ({
		canvas,
	}) => {
		await createFilledRecord(canvas);
		const before = await textColorByContent(canvas);

		await selectNameSlot(canvas);
		await canvas.setColor("font-color", "#ff0000");

		await expect
			.poll(async () => (await textColorByContent(canvas))[NAME_TEXT], {
				message: "the selected slot takes the new font color",
			})
			.toBe("rgb(255, 0, 0)");
		expect((await textColorByContent(canvas))[ATTRIBUTES_TEXT]).toBe(
			before[ATTRIBUTES_TEXT],
		);
	});

	test("steps out of the slot on the first Escape and clears the selection on the second", async ({
		canvas,
	}) => {
		await createFilledRecord(canvas);
		await selectNameSlot(canvas);

		await canvas.pressEscape();
		await expect
			.poll(async () => (await selectionOutlineHeights(canvas)).length, {
				message: "the first Escape drops only the slot",
			})
			.toBe(1);
		expect(await canvas.hasAnyControl()).toBe(true);

		await canvas.pressEscape();
		await expect
			.poll(() => canvas.hasAnyControl(), {
				message: "the second Escape clears the object selection",
			})
			.toBe(false);
	});

	test("walks the slots with Tab and wraps around", async ({ canvas }) => {
		await createFilledRecord(canvas);
		await canvas.selectAt(ATTRIBUTES_SPOT);

		/** Height of the slot outline; the two compartments differ in height, so it names the slot. */
		const slotOutlineHeight = async (): Promise<number | undefined> =>
			(await selectionOutlineHeights(canvas))[1];

		await canvas.page.keyboard.press("Tab");
		await expect
			.poll(slotOutlineHeight, { message: "Tab enters at the first slot" })
			.not.toBeUndefined();
		const firstSlotHeight = await slotOutlineHeight();

		await canvas.page.keyboard.press("Tab");
		await expect
			.poll(slotOutlineHeight, { message: "Tab moves on to the next slot" })
			.not.toBe(firstSlotHeight);

		await canvas.page.keyboard.press("Tab");
		await expect
			.poll(slotOutlineHeight, {
				message: "Tab wraps around to the first slot",
			})
			.toBe(firstSlotHeight);
	});

	test("opens the selected slot for editing on Enter", async ({ canvas }) => {
		await createFilledRecord(canvas);
		await selectNameSlot(canvas);

		await canvas.page.keyboard.press("Enter");
		await canvas.waitForTextEditor();
		await expect(canvas.textArea()).toHaveValue(NAME_TEXT);
		await canvas.cancelText();
	});
});
