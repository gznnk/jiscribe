import { test, expect, selectors } from "@jiscribe/canvas-sdk/testing/e2e";
import type { CanvasDriver } from "@jiscribe/canvas-sdk/testing/e2e";

/**
 * Selecting one text slot inside a multi-slot shape, one level below the object.
 * record is the type that has several, so it is the vehicle here. Guarded behavior:
 * - clicking a compartment of the already-selected record selects that slot, and
 *   the slot's own outline is drawn in place of the object's
 * - while the slot is selected the object outline and the transform handles go
 *   away, so only the slot box reads as the operated target
 * - a style change then lands on that slot alone, leaving the others as they were
 * - the object menu drops to the text items, since nothing else applies to a slot,
 *   Bold among them, laid out on the menu itself as it is for the whole object
 * - Escape steps out one level at a time: the slot first, the object next
 * - Tab walks the slots down the box and wraps around, over three slots as well as two
 * - Enter opens the selected slot for editing
 * - a Shift-click widens the selection to the run of compartments between the
 *   anchor and the clicked one, a style change then landing on all of them, and a
 *   plain click or a Tab collapses it back to one
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
 * The id of the slot the selected slot outline sits on, or undefined while no
 * slot is selected. The overlay carries no slot id, so the slot is named by
 * matching the outline's rect against the compartments' and reading the id out
 * of the matched compartment's `data-part` (`textSlot:<slotId>`). A stereotype
 * and a title band are the same height, so height alone would not name them.
 */
async function selectedSlotId(
	canvas: CanvasDriver,
	id: string,
): Promise<string | undefined> {
	return canvas.page.evaluate(
		({ objectId, partOutlineSelector }) => {
			const slotOutline = document.querySelector(partOutlineSelector);
			if (slotOutline === null) {
				return undefined;
			}
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
			const address = matched?.getAttribute("data-part");
			return address?.startsWith("textSlot:")
				? address.slice("textSlot:".length)
				: undefined;
		},
		{ objectId: id, partOutlineSelector: selectors.partOutline },
	);
}

/**
 * The slot id of every compartment the selection outlines, in the order the
 * overlay draws them. Read off each compartment's `data-part` address
 * (`textSlot:<slotId>`). Empty while only the object is selected.
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

/** Selects the record, then its title band as a slot (two different spots, so no dblclick). */
async function selectNameSlot(canvas: CanvasDriver): Promise<void> {
	await canvas.selectAt(ATTRIBUTES_SPOT);
	await canvas.clickAt(NAME_SPOT);
	await expect
		.poll(() => canvas.selectionOutlineKinds(), {
			message: "the slot outline replaces the object outline",
		})
		.toEqual(["part"]);
}

test.describe("record: selecting one text slot", () => {
	test("selects the clicked compartment as a slot of the already-selected record", async ({
		canvas,
	}) => {
		await createFilledRecord(canvas);

		// The first click only selects the object, so its outline is the one drawn.
		await canvas.selectAt(ATTRIBUTES_SPOT);
		expect(await canvas.selectionOutlineKinds()).toEqual(["object"]);

		await canvas.clickAt(NAME_SPOT);
		await expect.poll(() => canvas.selectionOutlineKinds()).toEqual(["part"]);
	});

	test("drops the object outline and the transform handles while a slot is selected", async ({
		canvas,
	}) => {
		await createFilledRecord(canvas);

		await canvas.selectAt(ATTRIBUTES_SPOT);
		expect(await canvas.selectionOutlineKinds()).toEqual(["object"]);
		expect(await transformHandleCount(canvas)).toBeGreaterThan(0);

		await canvas.clickAt(NAME_SPOT);
		await expect
			.poll(() => canvas.selectionOutlineKinds(), {
				message: "the slot outline replaces the object outline",
			})
			.toEqual(["part"]);
		expect(await transformHandleCount(canvas)).toBe(0);

		await canvas.pressEscape();
		await expect
			.poll(() => canvas.selectionOutlineKinds(), {
				message: "leaving the slot restores the object outline",
			})
			.toEqual(["object"]);
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
		const fontSizeToggle = canvas.page.locator(
			selectors.objectMenuToggle("font-size"),
		);
		const alignmentToggle = canvas.page.locator(
			selectors.objectMenuToggle("alignment"),
		);

		await canvas.selectAt(ATTRIBUTES_SPOT);
		await expect(backgroundColorToggle).toBeVisible();

		const objectMenu = canvas.page.locator(selectors.objectMenu);
		const fullMenuBox = await objectMenu.boundingBox();
		expect(fullMenuBox).not.toBeNull();

		await canvas.clickAt(NAME_SPOT);
		await expect
			.poll(() => canvas.selectionOutlineKinds(), {
				message: "the slot outline replaces the object outline",
			})
			.toEqual(["part"]);

		await expect(backgroundColorToggle).toHaveCount(0);
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

	test("offers Bold alone on the menu itself, with the object or a slot selected", async ({
		canvas,
	}) => {
		await createFilledRecord(canvas);

		const textFormatToggle = canvas.page.locator(
			selectors.objectMenuToggle("text-format"),
		);
		// Matched on the property alone: each button carries the value its *next* press
		// lands on, and the name slot ships bold and underlined.
		const bold = canvas.page.locator(
			`${selectors.objectMenu} [data-action^="set:fontWeight:"]`,
		);
		const otherFormats = canvas.page.locator(
			`${selectors.objectMenu} [data-action^="set:fontStyle:"], ${selectors.objectMenu} [data-action^="set:textDecoration:"]`,
		);

		await canvas.selectAt(ATTRIBUTES_SPOT);
		await expect(bold).toBeVisible();
		await expect(textFormatToggle).toHaveCount(0);
		await expect(otherFormats).toHaveCount(0);

		await canvas.clickAt(NAME_SPOT);
		await expect
			.poll(() => canvas.selectionOutlineKinds(), {
				message: "the slot outline replaces the object outline",
			})
			.toEqual(["part"]);
		await expect(bold).toBeVisible();
		await expect(textFormatToggle).toHaveCount(0);
		await expect(otherFormats).toHaveCount(0);
	});

	test("steps out of the slot on the first Escape and clears the selection on the second", async ({
		canvas,
	}) => {
		await createFilledRecord(canvas);
		await selectNameSlot(canvas);

		await canvas.pressEscape();
		await expect
			.poll(() => canvas.selectionOutlineKinds(), {
				message: "the first Escape drops only the slot",
			})
			.toEqual(["object"]);
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
				.poll(() => selectedSlotId(canvas, id), {
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
				.poll(() => selectedSlotId(canvas, id), {
					message: `Tab reaches the ${expectedPart} slot`,
				})
				.toBe(expectedPart);
		}
	});

	test("widens the selection to the run of compartments on a Shift-click", async ({
		canvas,
	}) => {
		const id = await createFilledRecord(canvas);
		await selectNameSlot(canvas);
		expect(await selectedSlotIds(canvas, id)).toEqual(["name"]);

		await canvas.shiftClickAt(ATTRIBUTES_SPOT);
		await expect
			.poll(() => selectedSlotIds(canvas, id), {
				message: "both compartments are outlined",
			})
			.toEqual(["name", "attributes"]);
		// The record stays the selection; the modifier did not toggle it off.
		expect(await canvas.hasAnyControl()).toBe(true);
	});

	test("applies a font color to every compartment of the range", async ({
		canvas,
	}) => {
		await createFilledRecord(canvas);
		await selectNameSlot(canvas);
		await canvas.shiftClickAt(ATTRIBUTES_SPOT);

		await canvas.setColor("font-color", "#ff0000");
		await expect
			.poll(async () => (await textColorByContent(canvas))[NAME_TEXT], {
				message: "the anchor compartment takes the new font color",
			})
			.toBe("rgb(255, 0, 0)");
		expect((await textColorByContent(canvas))[ATTRIBUTES_TEXT]).toBe(
			"rgb(255, 0, 0)",
		);
	});

	test("collapses the range back to the one compartment a plain click lands in", async ({
		canvas,
	}) => {
		const id = await createFilledRecord(canvas);
		await selectNameSlot(canvas);
		await canvas.shiftClickAt(ATTRIBUTES_SPOT);
		await expect
			.poll(() => selectedSlotIds(canvas, id))
			.toEqual(["name", "attributes"]);

		// A different spot from the Shift-click, so the pair is not read as a double click.
		await canvas.clickAt(NAME_SPOT);
		await expect
			.poll(() => selectedSlotIds(canvas, id), {
				message: "the plain click leaves only the compartment it landed in",
			})
			.toEqual(["name"]);
	});

	test("collapses the range and steps on with Tab", async ({ canvas }) => {
		const id = await createFilledRecord(canvas);
		await selectNameSlot(canvas);
		await canvas.shiftClickAt(ATTRIBUTES_SPOT);
		await expect
			.poll(() => selectedSlotIds(canvas, id))
			.toEqual(["name", "attributes"]);

		// Forward from the last of the range, which wraps back to the title band.
		await canvas.page.keyboard.press("Tab");
		await expect
			.poll(() => selectedSlotIds(canvas, id), {
				message: "Tab leaves one compartment selected",
			})
			.toEqual(["name"]);
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
