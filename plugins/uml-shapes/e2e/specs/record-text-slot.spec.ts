import { test, expect, selectors } from "@jiscribe/canvas-sdk/testing/e2e";
import type { CanvasDriver } from "@jiscribe/canvas-sdk/testing/e2e";

/**
 * Selecting one text slot inside a multi-slot shape, one level below the object.
 * record is the type that has several, so it is the vehicle here. Guarded behavior:
 * - clicking a compartment of the already-selected record selects that slot, and
 *   the slot's own outline is drawn on top of the object's
 * - while the slot is selected the object outline turns dashed and the transform
 *   handles go away, so only the slot box reads as the operated target
 * - a style change then lands on that slot alone, leaving the others as they were
 * - the object menu drops to the text items, since nothing else applies to a slot,
 *   and its text format buttons come out of their dropdown onto the menu itself
 * - Escape steps out one level at a time: the slot first, the object next
 * - Tab walks the slots down the box and wraps around, over three slots as well as two
 * - Enter opens the selected slot for editing
 *
 * Coordinate note (shared with record.spec): created at 220x80, a title band
 * holding a one-line title is the top 28px (content y=[200,228]) and the row
 * compartment sits below it (y=[228,280]).
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
 * Creates an object record and puts the test's own text in both slots in place of
 * the stencil's sample, so each test starts from the same committed content.
 */
async function createFilledRecord(canvas: CanvasDriver): Promise<string> {
	const id = await canvas.drawShapeFromFlyout(
		CATEGORY,
		"object",
		RECORD_FROM,
		RECORD_TO,
	);
	await canvas.deselect();
	await canvas.replaceTextAt(NAME_SPOT, NAME_TEXT);
	await canvas.commitText();
	await canvas.replaceTextAt(ATTRIBUTES_SPOT, ATTRIBUTES_TEXT);
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

/**
 * `stroke-dasharray` of the object's own outline, which the overlay draws before the
 * slot's. Absent (null) while the object itself is the operated target.
 */
async function objectOutlineDashArray(
	canvas: CanvasDriver,
): Promise<string | null> {
	return canvas.page.evaluate(() => {
		const outline = document.querySelector(
			'[data-layer="selection-overlay"] rect',
		);
		return outline?.getAttribute("stroke-dasharray") ?? null;
	});
}

/** How many resize/rotation handles are on screen; they all carry data-id="transform". */
async function transformHandleCount(canvas: CanvasDriver): Promise<number> {
	const controlDescriptors = await canvas.visibleControlIds();
	return controlDescriptors.filter((descriptor) =>
		descriptor.startsWith("transform/"),
	).length;
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

/**
 * The `data-part` of the compartment the selected slot outline sits on, or
 * undefined while no slot is selected. The overlay carries no slot id, so the
 * slot is named by matching the outline's rect against the compartments'. A
 * stereotype and a title band are the same height, so height alone would not
 * name them.
 */
async function selectedSlotPart(
	canvas: CanvasDriver,
	id: string,
): Promise<string | undefined> {
	return canvas.page.evaluate((objectId) => {
		const outlines = [
			...document.querySelectorAll('[data-layer="selection-overlay"] rect'),
		];
		// The object's own outline comes first and the slot's last, so fewer than
		// two means only the object is selected.
		if (outlines.length < 2) {
			return undefined;
		}
		const slotOutline = outlines[outlines.length - 1];
		const compartments = [
			...document.querySelectorAll(
				`[data-kind="object"][data-id="${objectId}"] [data-part]`,
			),
		];
		const matched = compartments.find(
			(compartment) =>
				compartment.getAttribute("y") === slotOutline.getAttribute("y") &&
				compartment.getAttribute("height") ===
					slotOutline.getAttribute("height"),
		);
		return matched?.getAttribute("data-part") ?? undefined;
	}, id);
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

	test("dashes the object outline and drops the transform handles while a slot is selected", async ({
		canvas,
	}) => {
		await createFilledRecord(canvas);

		await canvas.selectAt(ATTRIBUTES_SPOT);
		expect(await objectOutlineDashArray(canvas)).toBeNull();
		expect(await transformHandleCount(canvas)).toBeGreaterThan(0);

		await canvas.clickAt(NAME_SPOT);
		await expect
			.poll(() => objectOutlineDashArray(canvas), {
				message: "the object outline goes dashed once a slot is selected",
			})
			.not.toBeNull();
		expect(await transformHandleCount(canvas)).toBe(0);

		await canvas.pressEscape();
		await expect
			.poll(() => objectOutlineDashArray(canvas), {
				message: "leaving the slot restores the solid outline",
			})
			.toBeNull();
		expect(await transformHandleCount(canvas)).toBeGreaterThan(0);
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

	test("narrows the object menu to the text items while a slot is selected", async ({
		canvas,
	}) => {
		await createFilledRecord(canvas);

		const backgroundColorToggle = canvas.page.locator(
			selectors.objectMenuToggle("bg-color"),
		);
		const stackOrderToggle = canvas.page.locator(
			selectors.objectMenuToggle("stack-order"),
		);
		const fontSizeToggle = canvas.page.locator(
			selectors.objectMenuToggle("font-size"),
		);
		const alignmentToggle = canvas.page.locator(
			selectors.objectMenuToggle("alignment"),
		);

		await canvas.selectAt(ATTRIBUTES_SPOT);
		await expect(backgroundColorToggle).toBeVisible();
		await expect(stackOrderToggle).toBeVisible();

		const objectMenu = canvas.page.locator(selectors.objectMenu);
		const fullMenuBox = await objectMenu.boundingBox();
		expect(fullMenuBox).not.toBeNull();

		await canvas.clickAt(NAME_SPOT);
		await expect
			.poll(async () => (await selectionOutlineHeights(canvas)).length, {
				message: "the slot outline joins the object outline",
			})
			.toBe(2);

		await expect(backgroundColorToggle).toHaveCount(0);
		await expect(stackOrderToggle).toHaveCount(0);
		await expect(fontSizeToggle).toBeVisible();
		await expect(alignmentToggle).toBeVisible();

		// The narrowed menu must be re-measured and stay centered on the shape,
		// not keep the left edge computed from the full menu's width.
		await expect
			.poll(
				async () => {
					const narrowedMenuBox = await objectMenu.boundingBox();
					if (narrowedMenuBox === null || fullMenuBox === null) {
						return Number.POSITIVE_INFINITY;
					}
					const fullMenuCenterX = fullMenuBox.x + fullMenuBox.width / 2;
					const narrowedMenuCenterX =
						narrowedMenuBox.x + narrowedMenuBox.width / 2;
					return Math.abs(narrowedMenuCenterX - fullMenuCenterX);
				},
				{ message: "the narrowed menu keeps the shape-centered position" },
			)
			.toBeLessThanOrEqual(2);
	});

	test("lays the text format buttons out flat while a slot is selected", async ({
		canvas,
	}) => {
		await createFilledRecord(canvas);

		const textFormatToggle = canvas.page.locator(
			selectors.objectMenuToggle("text-format"),
		);
		// Matched on the property alone: each button carries the value its *next* press
		// lands on, and the name slot ships bold and underlined.
		const bold = canvas.page.locator('[data-part^="set:fontWeight:"]');
		const italic = canvas.page.locator('[data-part^="set:fontStyle:"]');

		// The whole object selected: the four stay behind the dropdown.
		await canvas.selectAt(ATTRIBUTES_SPOT);
		await expect(textFormatToggle).toBeVisible();
		await expect(bold).toHaveCount(0);

		await canvas.clickAt(NAME_SPOT);
		await expect
			.poll(async () => (await selectionOutlineHeights(canvas)).length, {
				message: "the slot outline joins the object outline",
			})
			.toBe(2);
		await expect(textFormatToggle).toHaveCount(0);
		await expect(bold).toBeVisible();
		await expect(italic).toBeVisible();

		await canvas.pressEscape();
		await expect(textFormatToggle).toBeVisible();
		await expect(bold).toHaveCount(0);
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

	test("walks the slots with Tab top to bottom and wraps around", async ({
		canvas,
	}) => {
		const id = await createFilledRecord(canvas);
		await canvas.selectAt(ATTRIBUTES_SPOT);

		// Tab follows the state's key order, which the mapper keeps equal to the
		// stacking order (see RecordMapper).
		for (const expectedPart of ["name", "attributes", "name"]) {
			await canvas.page.keyboard.press("Tab");
			await expect
				.poll(() => selectedSlotPart(canvas, id), {
					message: `Tab reaches the ${expectedPart} slot`,
				})
				.toBe(expectedPart);
		}
	});

	test("walks all three slots of a stereotyped record with Tab top to bottom before wrapping", async ({
		canvas,
	}) => {
		// The interface stencil is the preset carrying a stereotype: 220x100, so the
		// two 28px bands leave the operations compartment 44.
		const id = await canvas.drawShapeFromFlyout(
			CATEGORY,
			"interface",
			RECORD_FROM,
			{ x: 520, y: 300 },
		);
		await canvas.deselect();
		await canvas.selectAt({ x: 410, y: 280 });

		// The stereotype band is on top, so it is where Tab enters and where the
		// fourth Tab wraps back to.
		for (const expectedPart of [
			"stereotype",
			"name",
			"operations",
			"stereotype",
		]) {
			await canvas.page.keyboard.press("Tab");
			await expect
				.poll(() => selectedSlotPart(canvas, id), {
					message: `Tab reaches the ${expectedPart} slot`,
				})
				.toBe(expectedPart);
		}
	});

	test("opens the selected slot for editing on Enter", async ({ canvas }) => {
		await createFilledRecord(canvas);
		await selectNameSlot(canvas);

		await canvas.page.keyboard.press("Enter");
		await canvas.waitForTextEditor();
		await expect.poll(() => canvas.textEditorText()).toBe(NAME_TEXT);
		await canvas.cancelText();
	});
});
