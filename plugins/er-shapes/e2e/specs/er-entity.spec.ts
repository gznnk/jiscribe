import type { CanvasDoc, CanvasHandle } from "@jiscribe/canvas";
import { test, expect, selectors } from "@jiscribe/canvas-sdk/testing/e2e";
import type { CanvasDriver } from "@jiscribe/canvas-sdk/testing/e2e";
import { extractCanvasSourceFromSvgText } from "@jiscribe/doc/svg-source";
import {
	ER_ENTITY_DEFAULT_NAME_WIDTH,
	ER_ENTITY_DEFAULT_TYPE_WIDTH,
} from "@jiscribe/plugin-er-shapes";

/**
 * The entity drawn in a real browser: the slots a fresh one shows, editing them in
 * place, and a connector on a column's own connect point. What only a browser
 * answers is whether the drawing, the hit areas and the anchors agree with the
 * layout the unit tests pin.
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

/**
 * The typography one slot is drawn with: the computed style of the overlay whose
 * box is centered inside the slot's hit area.
 */
async function slotFont(
	canvas: CanvasDriver,
	objectId: string,
	slotId: string,
): Promise<{ fontSize: string; fontWeight: string; color: string }> {
	return canvas.page.evaluate(
		([id, part]) => {
			const shape = document.querySelector(
				`[data-kind="object"][data-id="${id}"]`,
			);
			const slot = shape?.querySelector(`[data-part="textSlot:${part}"]`);
			if (!shape || !slot) {
				throw new Error(`no slot ${part} on ${id}`);
			}
			const slotBox = slot.getBoundingClientRect();
			const overlay = [
				...(shape.nextElementSibling?.querySelectorAll("foreignObject") ?? []),
			].find((element) => {
				const box = element.getBoundingClientRect();
				const centerX = box.x + box.width / 2;
				const centerY = box.y + box.height / 2;
				return (
					centerX > slotBox.left &&
					centerX < slotBox.right &&
					centerY > slotBox.top &&
					centerY < slotBox.bottom
				);
			});
			const content = overlay?.firstElementChild?.firstElementChild;
			if (!content) {
				throw new Error(`no overlay drawn for ${part} on ${id}`);
			}
			const style = getComputedStyle(content);
			return {
				fontSize: style.fontSize,
				fontWeight: style.fontWeight,
				color: style.color,
			};
		},
		[objectId, slotId] as const,
	);
}

/**
 * The text every overlay of the entity draws, in DOM order. The overlays sit in
 * the group createFrameObject draws right after the shape's own element.
 */
async function drawnTexts(
	canvas: CanvasDriver,
	objectId: string,
): Promise<string[]> {
	return canvas.page.evaluate((id) => {
		const overlays = document.querySelector(
			`[data-kind="object"][data-id="${id}"]`,
		)?.nextElementSibling;
		return [...(overlays?.querySelectorAll("foreignObject") ?? [])].map(
			(element) => element.textContent ?? "",
		);
	}, objectId);
}

/** Double-clicks a slot where it is drawn, replaces its text and commits. */
async function replaceSlotText(
	canvas: CanvasDriver,
	objectId: string,
	slotId: string,
	text: string,
): Promise<void> {
	const slot = await slotRect(canvas, objectId, slotId);
	await canvas.page.mouse.dblclick(
		slot.x + slot.width / 2,
		slot.y + slot.height / 2,
	);
	await canvas.waitForTextEditor();
	await canvas.page
		.locator("textarea, [contenteditable=true]")
		.first()
		.fill(text);
	await canvas.commitText();
}

/**
 * The pressable rect of one grip: a column's, down the left edge, named by its
 * part id, or a lane's, across the top edge, named by the lane.
 */
function grip(
	canvas: CanvasDriver,
	control: "columnGrip" | "laneGrip",
	partId: string,
) {
	return canvas.page.locator(
		`[data-kind="control"][data-action="selection:erEntity:${control}:${partId}"]`,
	);
}

/** The pressable rect of one column's grip, named by the column's part id. */
function columnGrip(canvas: CanvasDriver, columnIndex: number) {
	return grip(canvas, "columnGrip", `col:${columnIndex}`);
}

/** The drawn cell of a grip: the painted rect behind the pressable one, which carries the fill. */
function gripFace(locator: ReturnType<typeof grip>) {
	// SVG elements sit in their own namespace, which a bare XPath name never matches.
	return locator.locator(
		"xpath=../preceding-sibling::*[local-name()='g'][1]/*[local-name()='rect']",
	);
}

/** The heading drawn on a grip: the row's number or the lane's name. */
function gripLabel(locator: ReturnType<typeof grip>) {
	return locator.locator(
		"xpath=../preceding-sibling::*[local-name()='text'][1]",
	);
}

/** The fill of a grip's cell, which is tinted while what it stands for is picked. */
async function gripFill(locator: ReturnType<typeof grip>): Promise<string> {
	return gripFace(locator).evaluate((face) => getComputedStyle(face).fill);
}

/** The fill of one column's grip, which is tinted while its column is picked. */
async function columnGripFill(
	canvas: CanvasDriver,
	columnIndex: number,
): Promise<string> {
	return gripFill(columnGrip(canvas, columnIndex));
}

/**
 * Clicks a grip at its middle, which picks the whole column or lane; with a
 * modifier held, the click extends ("shift") or toggles ("ctrl") a pick of its kind.
 */
async function clickGrip(
	canvas: CanvasDriver,
	locator: ReturnType<typeof grip>,
	modifier?: "shift" | "ctrl",
): Promise<void> {
	const box = await locator.boundingBox();
	if (box === null) {
		throw new Error("the grip is not drawn");
	}
	const point = canvas.toContent({
		x: box.x + box.width / 2,
		y: box.y + box.height / 2,
	});
	if (modifier === "shift") {
		await canvas.shiftClickAt(point);
	} else if (modifier === "ctrl") {
		await canvas.ctrlClickAt(point);
	} else {
		await canvas.clickAt(point);
	}
}

/**
 * Clicks one column's grip at its middle, which picks the whole column; with a
 * modifier held, the click extends ("shift") or toggles ("ctrl") a column pick.
 */
async function clickColumnGrip(
	canvas: CanvasDriver,
	columnIndex: number,
	modifier?: "shift" | "ctrl",
): Promise<void> {
	await clickGrip(canvas, columnGrip(canvas, columnIndex), modifier);
}

/** Which of the entity's columns draw their grip picked, by index. */
async function pickedColumns(
	canvas: CanvasDriver,
	objectId: string,
	unpickedFill: string,
): Promise<number[]> {
	const picked: number[] = [];
	const count = await columnCount(canvas, objectId);
	for (let columnIndex = 0; columnIndex < count; columnIndex++) {
		if ((await columnGripFill(canvas, columnIndex)) !== unpickedFill) {
			picked.push(columnIndex);
		}
	}
	return picked;
}

/** How many columns the entity draws, counted off its name slots. */
async function columnCount(
	canvas: CanvasDriver,
	objectId: string,
): Promise<number> {
	return canvas.page
		.locator(
			`[data-kind="object"][data-id="${objectId}"] [data-part^="textSlot:col:"][data-part$=":name"]`,
		)
		.count();
}

/** The entity's drawn height in client pixels. */
async function boxHeight(
	canvas: CanvasDriver,
	objectId: string,
): Promise<number> {
	const box = await canvas.objectById(objectId).boundingBox();
	if (box === null) {
		throw new Error(`entity ${objectId} is not drawn`);
	}
	return box.height;
}

/** Where every part outline (a picked slot's or column's box) is drawn, in client pixels. */
async function partOutlineRects(canvas: CanvasDriver): Promise<ClientRect[]> {
	return canvas.page.evaluate(
		(partOutlineSelector) =>
			[...document.querySelectorAll(partOutlineSelector)].map((outline) => {
				const box = outline.getBoundingClientRect();
				return { x: box.x, y: box.y, width: box.width, height: box.height };
			}),
		selectors.partOutline,
	);
}

/**
 * The slots of the entity a part outline is drawn over, one per outline in DOM
 * order, each found by the slot hit area holding the outline's center.
 */
async function pickedSlotIds(
	canvas: CanvasDriver,
	objectId: string,
): Promise<string[]> {
	return canvas.page.evaluate(
		({ id, partOutlineSelector }) => {
			const slots = [
				...document.querySelectorAll(
					`[data-kind="object"][data-id="${id}"] [data-part^="textSlot:"]`,
				),
			].map((slot) => ({
				slotId: (slot.getAttribute("data-part") ?? "").replace("textSlot:", ""),
				box: slot.getBoundingClientRect(),
			}));
			return [...document.querySelectorAll(partOutlineSelector)].map(
				(outline) => {
					const box = outline.getBoundingClientRect();
					const x = box.x + box.width / 2;
					const y = box.y + box.height / 2;
					const found = slots.find(
						(slot) =>
							x >= slot.box.x &&
							x <= slot.box.x + slot.box.width &&
							y >= slot.box.y &&
							y <= slot.box.y + slot.box.height,
					);
					if (found === undefined) {
						throw new Error(`a part outline sits over no slot of ${id}`);
					}
					return found.slotId;
				},
			);
		},
		{ id: objectId, partOutlineSelector: selectors.partOutline },
	);
}

/** The middle of one slot's hit area, in content coordinates. */
async function slotCenter(
	canvas: CanvasDriver,
	objectId: string,
	slotId: string,
) {
	const slot = await slotRect(canvas, objectId, slotId);
	return canvas.toContent({
		x: slot.x + slot.width / 2,
		y: slot.y + slot.height / 2,
	});
}

/** The global mountPluginHarness publishes the default page's handle on. */
type HarnessWindow = { __canvasHandle?: CanvasHandle | null };

/**
 * One object of the document as the canvas would save it, read back out of the
 * `.jis` source an SVG export embeds — the same state-to-document conversion a
 * save goes through.
 */
async function savedObject(
	canvas: CanvasDriver,
	objectId: string,
): Promise<Record<string, unknown>> {
	const svgText = await canvas.page.evaluate(() => {
		const handle = (window as unknown as HarnessWindow).__canvasHandle;
		if (!handle) {
			throw new Error(
				"__canvasHandle is undefined (harness hook not installed)",
			);
		}
		return handle.export.toSvgString();
	});
	const sourceText =
		svgText === null ? null : extractCanvasSourceFromSvgText(svgText);
	if (sourceText === null) {
		throw new Error("the export embeds no source");
	}
	const saved = (JSON.parse(sourceText) as CanvasDoc).root.find(
		(object) => object.id === objectId,
	);
	if (saved === undefined) {
		throw new Error(`the saved document holds no ${objectId}`);
	}
	return saved as unknown as Record<string, unknown>;
}

/** Where a connector's source end is drawn, in client pixels. */
async function connectorStart(
	canvas: CanvasDriver,
	connectorId: string,
): Promise<{ x: number; y: number }> {
	const [source] = await canvas.connectorPoints(connectorId);
	return canvas.objectById(connectorId).evaluate((element, point) => {
		const matrix = (element as SVGGraphicsElement).getScreenCTM();
		if (matrix === null) {
			throw new Error("the connector is not drawn");
		}
		const client = new DOMPoint(point.x, point.y).matrixTransform(matrix);
		return { x: client.x, y: client.y };
	}, source);
}

/** The middle of a column's row on the box's right edge, in client pixels: where its right connect point is drawn. */
async function rowRightEdge(
	canvas: CanvasDriver,
	objectId: string,
	columnIndex: number,
): Promise<{ x: number; y: number }> {
	const type = await slotRect(canvas, objectId, `col:${columnIndex}:type`);
	return { x: type.x + type.width, y: type.y + type.height / 2 };
}

/** Types into the editor an insertion opened and commits it. */
async function typeIntoOpenEditor(
	canvas: CanvasDriver,
	text: string,
): Promise<void> {
	await canvas.waitForTextEditor();
	await canvas.page.keyboard.type(text);
	await canvas.commitText();
}

test.describe("erEntity", () => {
	test("places a fresh entity whose every text is a slot of its own", async ({
		canvas,
	}) => {
		const id = await canvas.placeShapeFromFlyout(CATEGORY, PRESET);

		const parts = await canvas.page.evaluate(
			(objectId) =>
				[
					...document.querySelectorAll(
						`[data-kind="object"][data-id="${objectId}"] [data-part]`,
					),
				].map((element) => element.getAttribute("data-part")),
			id,
		);
		expect(parts).toEqual([
			"textSlot:name",
			"textSlot:col:0:key",
			"textSlot:col:0:name",
			"textSlot:col:0:type",
			"textSlot:col:1:key",
			"textSlot:col:1:name",
			"textSlot:col:1:type",
			"textSlot:col:2:key",
			"textSlot:col:2:name",
			"textSlot:col:2:type",
		]);

		// The key gutter, the name and the type sit side by side on one row.
		const key = await slotRect(canvas, id, "col:0:key");
		const name = await slotRect(canvas, id, "col:0:name");
		const type = await slotRect(canvas, id, "col:0:type");
		expect(name.x).toBeCloseTo(key.x + key.width, 0);
		expect(type.x).toBeCloseTo(name.x + name.width, 0);
		expect(name.y).toBeCloseTo(key.y, 0);
	});

	test("edits a slot in place, and leaves a name as it was when its key gains PK", async ({
		canvas,
	}) => {
		const id = await canvas.placeShapeFromFlyout(CATEGORY, PRESET);
		await canvas.deselect();

		await replaceSlotText(canvas, id, "col:1:type", "text");
		await expect
			.poll(async () => (await drawnTexts(canvas, id)).join("|"))
			.toContain("text");
		expect((await drawnTexts(canvas, id)).join("|")).not.toContain(
			"varchar(100)",
		);

		// Writing PK into the third column's empty gutter leaves its name's weight,
		// its row, the box's height and the single divider as they were.
		const before = await slotRect(canvas, id, "col:2:name");
		const heightBefore = await boxHeight(canvas, id);
		expect((await slotFont(canvas, id, "col:2:name")).fontWeight).toBe("400");
		await replaceSlotText(canvas, id, "col:2:key", "PK");
		await expect
			.poll(
				async () =>
					(await drawnTexts(canvas, id)).filter((text) => text === "PK").length,
			)
			.toBe(2);
		expect((await slotFont(canvas, id, "col:2:name")).fontWeight).toBe("400");
		expect((await slotRect(canvas, id, "col:2:name")).y).toBeCloseTo(
			before.y,
			0,
		);
		expect(await boxHeight(canvas, id)).toBeCloseTo(heightBefore, 0);
		await expect(canvas.objectById(id).locator("line")).toHaveCount(1);
	});

	test("commits a column slot on Enter with no line break, the title still taking one", async ({
		canvas,
	}) => {
		const id = await canvas.placeShapeFromFlyout(CATEGORY, PRESET);
		await canvas.deselect();

		const columnName = await slotRect(canvas, id, "col:0:name");
		await canvas.page.mouse.dblclick(
			columnName.x + columnName.width / 2,
			columnName.y + columnName.height / 2,
		);
		await canvas.waitForTextEditor();
		await canvas.textEditorSurface().fill("");
		await canvas.page.keyboard.type("order_id");
		await canvas.page.keyboard.press("Enter");

		await expect(canvas.page.locator(selectors.textEditor)).toHaveCount(0);
		const saved = (await savedObject(canvas, id)) as {
			columns: { name?: string }[];
		};
		expect(saved.columns[0]?.name).toBe("order_id");

		const title = await slotRect(canvas, id, "name");
		await canvas.page.mouse.dblclick(
			title.x + title.width / 2,
			title.y + title.height / 2,
		);
		await canvas.waitForTextEditor();
		await canvas.textEditorSurface().fill("");
		await canvas.page.keyboard.type("order");
		await canvas.page.keyboard.press("Enter");
		await canvas.page.keyboard.type("lines");
		expect(await canvas.textEditorText()).toBe("order\nlines");
		await canvas.cancelText();
	});

	test("pastes a multi-line text into a column slot as one line", async ({
		canvas,
	}) => {
		const id = await canvas.placeShapeFromFlyout(CATEGORY, PRESET);
		await canvas.deselect();

		const columnType = await slotRect(canvas, id, "col:0:type");
		await canvas.page.mouse.dblclick(
			columnType.x + columnType.width / 2,
			columnType.y + columnType.height / 2,
		);
		await canvas.waitForTextEditor();
		await canvas.textEditorSurface().fill("");
		await canvas.textEditorSurface().evaluate((surface, pasted) => {
			const clipboardData = new DataTransfer();
			clipboardData.setData("text/plain", pasted);
			surface.dispatchEvent(
				new ClipboardEvent("paste", {
					clipboardData,
					bubbles: true,
					cancelable: true,
				}),
			);
		}, "varchar\r\n(100)\nnot null");

		await expect
			.poll(() => canvas.textEditorText())
			.toBe("varchar (100) not null");
		await canvas.commitText();
		const saved = (await savedObject(canvas, id)) as {
			columns: { type?: string }[];
		};
		expect(saved.columns[0]?.type).toBe("varchar (100) not null");
		expect((await drawnTexts(canvas, id)).join("|")).toContain(
			"varchar (100) not null",
		);
	});

	test("offers each column's left and right points but not the edge midpoints", async ({
		canvas,
	}) => {
		// Placed and left selected, which is when the anchors are drawn.
		const id = await canvas.placeShapeFromFlyout(CATEGORY, PRESET);
		const anchorDot = (position: string) =>
			canvas.page.locator(
				`[data-layer="connection-anchors"] [data-id="${id}"][data-action="anchor:${position}"]`,
			);

		await expect(anchorDot("col:0:left")).toHaveCount(1);
		await expect(anchorDot("col:2:right")).toHaveCount(1);
		await expect(anchorDot("topCenter")).toHaveCount(1);
		await expect(anchorDot("leftCenter")).toHaveCount(0);
		await expect(anchorDot("rightCenter")).toHaveCount(0);
	});

	test("attaches a connector to one column's right edge", async ({
		canvas,
	}) => {
		// Placed and left selected, which is when the anchors are drawn.
		const id = await canvas.placeShapeFromFlyout(CATEGORY, PRESET);
		const type = await slotRect(canvas, id, "col:1:type");
		const rowRight = {
			x: type.x + type.width,
			y: type.y + type.height / 2,
		};

		const connectorId = await canvas.createConnector(
			"col:1:right",
			canvas.toContent({ x: rowRight.x + 160, y: rowRight.y + 40 }),
		);

		// The connector's source end is on the box's right edge at the row's middle.
		const start = await connectorStart(canvas, connectorId);
		expect(start.x).toBeCloseTo(rowRight.x, 0);
		expect(start.y).toBeCloseTo(rowRight.y, 0);
	});
});

test.describe("erEntity columns", () => {
	test("picks a column by its grip, Delete removes it, shrinks the box and drops the pick", async ({
		canvas,
	}) => {
		const id = await canvas.placeShapeFromFlyout(CATEGORY, PRESET);
		const unpickedFill = await columnGripFill(canvas, 1);
		const heightBefore = await boxHeight(canvas, id);

		await clickColumnGrip(canvas, 1);
		await expect.poll(() => columnGripFill(canvas, 1)).not.toBe(unpickedFill);
		expect(await columnGripFill(canvas, 0)).toBe(unpickedFill);

		await canvas.deleteSelection();
		await expect.poll(() => columnCount(canvas, id)).toBe(2);
		expect((await drawnTexts(canvas, id)).join("|")).not.toContain(
			"varchar(100)",
		);
		// One row less: the row pitch at 100%.
		expect(heightBefore - (await boxHeight(canvas, id))).toBeCloseTo(25, 0);
		// The removal drops the pick, as a table's does (DeleteCommand).
		await expect.poll(() => partOutlineRects(canvas)).toHaveLength(0);
		expect(await columnGripFill(canvas, 1)).toBe(unpickedFill);

		// Enter over the column that moved into the removed one's place opens its
		// name. Picked from the one above, as a second click on the same grip would
		// read as a double click.
		await clickColumnGrip(canvas, 0);
		await canvas.page.keyboard.press("ArrowDown");
		await expect.poll(() => columnGripFill(canvas, 1)).not.toBe(unpickedFill);
		await canvas.page.keyboard.press("Enter");
		await canvas.waitForTextEditor();
		expect(await canvas.textEditorText()).toBe("created_at");
		await canvas.cancelText();
	});

	test("empties a picked slot with Delete, the entity and its columns staying", async ({
		canvas,
	}) => {
		// Placed and left selected, so a click on a slot picks it.
		const id = await canvas.placeShapeFromFlyout(CATEGORY, PRESET);
		const type = await slotRect(canvas, id, "col:1:type");
		await canvas.page.mouse.click(
			type.x + type.width / 2,
			type.y + type.height / 2,
		);

		await canvas.deleteSelection();
		await expect
			.poll(async () => (await drawnTexts(canvas, id)).join("|"))
			.not.toContain("varchar(100)");
		await expect(canvas.objectById(id)).toHaveCount(1);
		expect(await columnCount(canvas, id)).toBe(3);
		expect((await drawnTexts(canvas, id)).join("|")).toContain("name");

		// The clearing drops the pick, as a table's does (DeleteCommand), so an
		// empty slot is picked again — a different one, two clicks on a spot being a
		// double click. Delete over it is refused rather than falling through to
		// the entity.
		const emptyKey = await slotRect(canvas, id, "col:1:key");
		await canvas.page.mouse.click(
			emptyKey.x + emptyKey.width / 2,
			emptyKey.y + emptyKey.height / 2,
		);
		await expect.poll(() => partOutlineRects(canvas)).toHaveLength(1);
		await canvas.deleteSelection();
		await expect(canvas.objectById(id)).toHaveCount(1);
		expect(await columnCount(canvas, id)).toBe(3);
	});

	test("runs a column pick from the one picked to the one Shift-clicked", async ({
		canvas,
	}) => {
		const id = await canvas.placeShapeFromFlyout(CATEGORY, PRESET);
		const unpickedFill = await columnGripFill(canvas, 0);

		await clickColumnGrip(canvas, 0);
		await clickColumnGrip(canvas, 2, "shift");

		await expect
			.poll(() => pickedColumns(canvas, id, unpickedFill))
			.toEqual([0, 1, 2]);
		expect(await partOutlineRects(canvas)).toHaveLength(3);

		// The anchor stays where the pick began, so a second Shift-click narrows it.
		await clickColumnGrip(canvas, 1, "shift");
		await expect
			.poll(() => pickedColumns(canvas, id, unpickedFill))
			.toEqual([0, 1]);
	});

	test("adds a column to the pick with Ctrl, and Delete removes every picked column", async ({
		canvas,
	}) => {
		const id = await canvas.placeShapeFromFlyout(CATEGORY, PRESET);
		const unpickedFill = await columnGripFill(canvas, 0);

		await clickColumnGrip(canvas, 0);
		await clickColumnGrip(canvas, 2, "ctrl");
		await expect
			.poll(() => pickedColumns(canvas, id, unpickedFill))
			.toEqual([0, 2]);

		await canvas.deleteSelection();
		await expect.poll(() => columnCount(canvas, id)).toBe(1);
		const texts = (await drawnTexts(canvas, id)).join("|");
		expect(texts).toContain("varchar(100)");
		expect(texts).not.toContain("created_at");
		// The removal drops the pick.
		await expect
			.poll(() => pickedColumns(canvas, id, unpickedFill))
			.toEqual([]);
	});

	test("takes the last picked column out with Ctrl, leaving the entity selected", async ({
		canvas,
	}) => {
		const id = await canvas.placeShapeFromFlyout(CATEGORY, PRESET);
		const unpickedFill = await columnGripFill(canvas, 0);

		// Alternating grips, as two clicks on one spot would read as a double click.
		await clickColumnGrip(canvas, 0);
		await clickColumnGrip(canvas, 1, "ctrl");
		await clickColumnGrip(canvas, 0, "ctrl");
		await expect
			.poll(() => pickedColumns(canvas, id, unpickedFill))
			.toEqual([1]);

		await clickColumnGrip(canvas, 1, "ctrl");
		await expect
			.poll(() => pickedColumns(canvas, id, unpickedFill))
			.toEqual([]);
		expect(await partOutlineRects(canvas)).toHaveLength(0);
		// The grips are drawn only while the entity is selected.
		await expect(columnGrip(canvas, 0)).toHaveCount(1);
	});

	test("widens a column pick with Shift+ArrowDown and moves it with ArrowDown, the entity staying put", async ({
		canvas,
	}) => {
		const id = await canvas.placeShapeFromFlyout(CATEGORY, PRESET);
		const unpickedFill = await columnGripFill(canvas, 0);
		await clickColumnGrip(canvas, 0);
		const boxBefore = await canvas.objectById(id).boundingBox();

		await canvas.page.keyboard.press("Shift+ArrowDown");
		await expect
			.poll(() => pickedColumns(canvas, id, unpickedFill))
			.toEqual([0, 1]);

		await canvas.page.keyboard.press("ArrowDown");
		await expect
			.poll(() => pickedColumns(canvas, id, unpickedFill))
			.toEqual([2]);

		// Neither arrow reached the nudge.
		expect(await canvas.objectById(id).boundingBox()).toEqual(boxBefore);
	});

	test("inserts below a picked column with Alt+Shift+ArrowDown and edits its name", async ({
		canvas,
	}) => {
		const id = await canvas.placeShapeFromFlyout(CATEGORY, PRESET);
		await clickColumnGrip(canvas, 0);

		await canvas.page.keyboard.press("Alt+Shift+ArrowDown");
		await typeIntoOpenEditor(canvas, "org_id");

		await expect.poll(() => columnCount(canvas, id)).toBe(4);
		const texts = (await drawnTexts(canvas, id)).join("|");
		expect(texts).toContain("org_id");
		// Declared right after the primary key, so drawn right under it.
		const inserted = await slotRect(canvas, id, "col:1:name");
		const shifted = await slotRect(canvas, id, "col:2:name");
		expect(inserted.y).toBeLessThan(shifted.y);
	});

	test("keeps a connector on its column when a column is inserted above it and when one before it is deleted", async ({
		canvas,
	}) => {
		const id = await canvas.placeShapeFromFlyout(CATEGORY, PRESET);
		const rowRight = await rowRightEdge(canvas, id, 1);
		const connectorId = await canvas.createConnector(
			"col:1:right",
			canvas.toContent({ x: rowRight.x + 160, y: rowRight.y + 40 }),
		);

		// Inserted above column 1: the connector's column is column 2 now.
		await canvas.clickAt(await slotCenter(canvas, id, "name"));
		await clickColumnGrip(canvas, 1);
		await canvas.page.keyboard.press("Alt+Shift+ArrowUp");
		await typeIntoOpenEditor(canvas, "org_id");
		await expect.poll(() => columnCount(canvas, id)).toBe(4);
		const afterInsert = await rowRightEdge(canvas, id, 2);
		await expect
			.poll(async () => (await connectorStart(canvas, connectorId)).y)
			.toBeCloseTo(afterInsert.y, 0);
		expect((await connectorStart(canvas, connectorId)).x).toBeCloseTo(
			afterInsert.x,
			0,
		);

		// Column 0 deleted: the connector's column moves up to column 1.
		await canvas.clickAt(await slotCenter(canvas, id, "name"));
		await clickColumnGrip(canvas, 0);
		await canvas.deleteSelection();
		await expect.poll(() => columnCount(canvas, id)).toBe(3);
		const afterDelete = await rowRightEdge(canvas, id, 1);
		await expect
			.poll(async () => (await connectorStart(canvas, connectorId)).y)
			.toBeCloseTo(afterDelete.y, 0);
		expect((await connectorStart(canvas, connectorId)).x).toBeCloseTo(
			afterDelete.x,
			0,
		);
	});

	test("keeps a connector on its column when one before it is deleted from the context menu", async ({
		canvas,
	}) => {
		const id = await canvas.placeShapeFromFlyout(CATEGORY, PRESET);
		const rowRight = await rowRightEdge(canvas, id, 1);
		const connectorId = await canvas.createConnector(
			"col:1:right",
			canvas.toContent({ x: rowRight.x + 160, y: rowRight.y + 40 }),
		);

		await canvas.clickAt(await slotCenter(canvas, id, "name"));
		await clickColumnGrip(canvas, 0);
		await canvas.openContextMenu(await slotCenter(canvas, id, "col:0:name"));
		await canvas.clickContextMenuCommand("delete");

		await expect.poll(() => columnCount(canvas, id)).toBe(2);
		const afterDelete = await rowRightEdge(canvas, id, 0);
		await expect
			.poll(async () => (await connectorStart(canvas, connectorId)).y)
			.toBeCloseTo(afterDelete.y, 0);
		expect((await connectorStart(canvas, connectorId)).x).toBeCloseTo(
			afterDelete.x,
			0,
		);
	});

	test("undoes a column deletion and the connector it renumbered in one step", async ({
		canvas,
	}) => {
		const id = await canvas.placeShapeFromFlyout(CATEGORY, PRESET);
		const rowRight = await rowRightEdge(canvas, id, 1);
		const connectorId = await canvas.createConnector(
			"col:1:right",
			canvas.toContent({ x: rowRight.x + 160, y: rowRight.y + 40 }),
		);

		// Column 0 deleted: the connector's column moves up to column 0.
		await canvas.clickAt(await slotCenter(canvas, id, "name"));
		await clickColumnGrip(canvas, 0);
		await canvas.deleteSelection();
		await expect.poll(() => columnCount(canvas, id)).toBe(2);
		const afterDelete = await rowRightEdge(canvas, id, 0);
		await expect
			.poll(async () => (await connectorStart(canvas, connectorId)).y)
			.toBeCloseTo(afterDelete.y, 0);

		await canvas.undo();

		await expect.poll(() => columnCount(canvas, id)).toBe(3);
		const restored = await rowRightEdge(canvas, id, 1);
		await expect
			.poll(async () => (await connectorStart(canvas, connectorId)).y)
			.toBeCloseTo(restored.y, 0);
		expect((await connectorStart(canvas, connectorId)).x).toBeCloseTo(
			restored.x,
			0,
		);
	});

	test("heads the rows with their numbers and the lanes with their names, outside the left and top edges", async ({
		canvas,
	}) => {
		const id = await canvas.placeShapeFromFlyout(CATEGORY, PRESET);

		for (const columnIndex of [0, 1, 2]) {
			await expect(gripLabel(columnGrip(canvas, columnIndex))).toHaveText(
				String(columnIndex + 1),
			);
		}
		await expect(columnGrip(canvas, 3)).toHaveCount(0);
		for (const [lane, label] of [
			["key", "Key"],
			["name", "Name"],
			["type", "Type"],
		] as const) {
			await expect(gripLabel(grip(canvas, "laneGrip", lane))).toHaveText(label);
		}

		// Abutting the entity, as a table's grips abut the table: the row's grip
		// against its key slot, the key lane's over the title band, as wide as the
		// key slot.
		const rowFace = await gripFace(columnGrip(canvas, 0)).boundingBox();
		const laneFace = await gripFace(
			grip(canvas, "laneGrip", "key"),
		).boundingBox();
		const firstKey = await slotRect(canvas, id, "col:0:key");
		const title = await slotRect(canvas, id, "name");
		expect(rowFace!.x + rowFace!.width).toBeCloseTo(firstKey.x, 0);
		expect(rowFace!.y).toBeCloseTo(firstKey.y, 0);
		expect(laneFace!.y + laneFace!.height).toBeCloseTo(title.y, 0);
		expect(laneFace!.x).toBeCloseTo(firstKey.x, 0);
		expect(laneFace!.width).toBeCloseTo(firstKey.width, 0);
	});

	test("inserts below a picked slot from the menu", async ({ canvas }) => {
		const id = await canvas.placeShapeFromFlyout(CATEGORY, PRESET);
		const type = await slotRect(canvas, id, "col:1:type");
		await canvas.clickAt(
			canvas.toContent({
				x: type.x + type.width / 2,
				y: type.y + type.height / 2,
			}),
		);

		await canvas.page.click(
			selectors.objectMenuCommand("erEntity.insertColumnBelow"),
		);
		await typeIntoOpenEditor(canvas, "email");

		await expect.poll(() => columnCount(canvas, id)).toBe(4);
		const inserted = await slotRect(canvas, id, "col:2:name");
		const shifted = await slotRect(canvas, id, "col:3:name");
		expect(inserted.y).toBeLessThan(shifted.y);
		expect((await drawnTexts(canvas, id)).join("|")).toContain("email");
	});

	test("appends a column to the entity selected as a whole from the menu", async ({
		canvas,
	}) => {
		const id = await canvas.placeShapeFromFlyout(CATEGORY, PRESET);
		await expect(
			canvas.page.locator(
				selectors.objectMenuCommand("erEntity.insertColumnBelow"),
			),
		).toHaveCount(0);

		await canvas.page.click(
			selectors.objectMenuCommand("erEntity.appendColumn"),
		);
		await typeIntoOpenEditor(canvas, "updated_at");

		await expect.poll(() => columnCount(canvas, id)).toBe(4);
		const last = await slotRect(canvas, id, "col:3:name");
		const previous = await slotRect(canvas, id, "col:2:name");
		expect(last.y).toBeGreaterThan(previous.y);
		expect((await drawnTexts(canvas, id)).join("|")).toContain("updated_at");
	});

	test("appends a column on Tab from the last slot and carries on editing its name, the Tab undone in one step", async ({
		canvas,
	}) => {
		const id = await canvas.placeShapeFromFlyout(CATEGORY, PRESET);
		const heightBefore = await boxHeight(canvas, id);
		const lastSlot = await slotRect(canvas, id, "col:2:type");
		await canvas.page.mouse.dblclick(
			lastSlot.x + lastSlot.width / 2,
			lastSlot.y + lastSlot.height / 2,
		);
		await canvas.waitForTextEditor();
		await canvas.page
			.locator("textarea, [contenteditable=true]")
			.first()
			.fill("datetime");

		await canvas.page.keyboard.press("Tab");

		await expect.poll(() => columnCount(canvas, id)).toBe(4);
		await expect(canvas.textEditorSurface()).toBeFocused();
		// The name, past the new row's key.
		expect(await pickedSlotIds(canvas, id)).toEqual(["col:3:name"]);
		expect(await canvas.textEditorText()).toBe("");
		await canvas.page.keyboard.type("updated_at");
		expect(await canvas.textEditorText()).toBe("updated_at");
		await canvas.commitText();
		const texts = (await drawnTexts(canvas, id)).join("|");
		expect(texts).toContain("datetime");
		expect(texts).toContain("updated_at");

		// The name typed is an entry of its own; the one before it is the Tab's,
		// which holds the row and the last slot's commit together.
		await canvas.undo();
		await expect
			.poll(async () => (await drawnTexts(canvas, id)).join("|"))
			.not.toContain("updated_at");
		expect(await columnCount(canvas, id)).toBe(4);

		await canvas.undo();

		await expect.poll(() => columnCount(canvas, id)).toBe(3);
		const restored = (await drawnTexts(canvas, id)).join("|");
		expect(restored).toContain("timestamp");
		expect(restored).not.toContain("datetime");
		expect(await boxHeight(canvas, id)).toBeCloseTo(heightBefore, 0);
	});

	test("outlines a picked slot and a picked column exactly on the row, the rows tiling with no gap", async ({
		canvas,
	}) => {
		const id = await canvas.placeShapeFromFlyout(CATEGORY, PRESET);
		const firstName = await slotRect(canvas, id, "col:0:name");
		const secondName = await slotRect(canvas, id, "col:1:name");
		const thirdName = await slotRect(canvas, id, "col:2:name");
		// The hit areas tile the rows: each row starts where the one above ends.
		expect(secondName.y).toBeCloseTo(firstName.y + firstName.height, 0);
		expect(thirdName.y).toBeCloseTo(secondName.y + secondName.height, 0);
		expect(secondName.height).toBeCloseTo(25, 0);

		await canvas.clickAt(
			canvas.toContent({
				x: secondName.x + secondName.width / 2,
				y: secondName.y + secondName.height / 2,
			}),
		);
		await expect
			.poll(async () => (await partOutlineRects(canvas)).length)
			.toBe(1);
		const [slotOutline] = await partOutlineRects(canvas);
		expect(slotOutline.x).toBeCloseTo(secondName.x, 0);
		expect(slotOutline.y).toBeCloseTo(secondName.y, 0);
		expect(slotOutline.width).toBeCloseTo(secondName.width, 0);
		expect(slotOutline.height).toBeCloseTo(secondName.height, 0);

		await clickColumnGrip(canvas, 1);
		const grip = await columnGrip(canvas, 1).boundingBox();
		const key = await slotRect(canvas, id, "col:1:key");
		const type = await slotRect(canvas, id, "col:1:type");
		await expect
			.poll(async () => (await partOutlineRects(canvas))[0]?.x)
			.toBeCloseTo(key.x, 0);
		const [columnOutline] = await partOutlineRects(canvas);
		expect(columnOutline.y).toBeCloseTo(secondName.y, 0);
		expect(columnOutline.height).toBeCloseTo(secondName.height, 0);
		expect(columnOutline.x + columnOutline.width).toBeCloseTo(
			type.x + type.width,
			0,
		);
		expect(grip?.y).toBeCloseTo(secondName.y, 0);
		expect(grip?.height).toBeCloseTo(secondName.height, 0);
	});

	test("applies a font size set with one slot picked to that slot's row alone", async ({
		canvas,
	}) => {
		const id = await canvas.placeShapeFromFlyout(CATEGORY, PRESET);
		const heightBefore = await boxHeight(canvas, id);
		const type = await slotRect(canvas, id, "col:1:type");
		await canvas.clickAt(
			canvas.toContent({
				x: type.x + type.width / 2,
				y: type.y + type.height / 2,
			}),
		);

		await canvas.openObjectMenu("font-size");
		await canvas.setNumberInput("fontSize", 20);

		// That row grows from the 25 px pitch to 34 (1.5 em plus the text box padding); the others keep theirs.
		await expect
			.poll(async () => (await boxHeight(canvas, id)) - heightBefore)
			.toBeCloseTo(9, 0);
		expect((await slotRect(canvas, id, "col:1:name")).height).toBeCloseTo(
			34,
			0,
		);
		expect((await slotRect(canvas, id, "col:2:name")).height).toBeCloseTo(
			25,
			0,
		);
		expect((await slotFont(canvas, id, "col:1:type")).fontSize).toBe("20px");
		expect((await slotFont(canvas, id, "col:1:name")).fontSize).toBe("14px");
	});

	test("states one font size for a fresh entity with nothing picked", async ({
		canvas,
	}) => {
		await canvas.placeShapeFromFlyout(CATEGORY, PRESET);

		await canvas.openObjectMenu("font-size");

		await expect(
			canvas.page.getByTestId("menu-number-input:fontSize"),
		).toHaveValue("14");
	});

	test("applies a font size set with nothing picked to every text", async ({
		canvas,
	}) => {
		const id = await canvas.placeShapeFromFlyout(CATEGORY, PRESET);
		const columns = await columnCount(canvas, id);

		await canvas.openObjectMenu("font-size");
		await canvas.setNumberInput("fontSize", 20);

		await expect
			.poll(async () => (await slotRect(canvas, id, "col:2:name")).height)
			.toBeCloseTo(34, 0);
		for (let columnIndex = 0; columnIndex < columns; columnIndex++) {
			expect(
				(await slotFont(canvas, id, `col:${columnIndex}:name`)).fontSize,
			).toBe("20px");
		}
		expect((await slotFont(canvas, id, "col:0:key")).fontSize).toBe("20px");
		expect((await slotFont(canvas, id, "name")).fontSize).toBe("20px");
	});

	test("keeps a bold set by Ctrl+B with one slot picked", async ({
		canvas,
	}) => {
		const id = await canvas.placeShapeFromFlyout(CATEGORY, PRESET);
		const type = await slotRect(canvas, id, "col:1:type");
		await canvas.clickAt(
			canvas.toContent({
				x: type.x + type.width / 2,
				y: type.y + type.height / 2,
			}),
		);
		expect((await slotFont(canvas, id, "col:1:type")).fontWeight).toBe("400");

		await canvas.page.keyboard.press("ControlOrMeta+b");

		await expect
			.poll(async () => (await slotFont(canvas, id, "col:1:type")).fontWeight)
			.toBe("700");
		expect((await slotFont(canvas, id, "col:2:type")).fontWeight).toBe("400");
	});
});

test.describe("erEntity slot pick", () => {
	test("runs a Shift-click down one field, the slots between in the other fields left out", async ({
		canvas,
	}) => {
		// Placed and left selected, so a click on a slot picks it.
		const id = await canvas.placeShapeFromFlyout(CATEGORY, PRESET);
		await canvas.clickAt(await slotCenter(canvas, id, "col:0:name"));
		await expect.poll(() => pickedSlotIds(canvas, id)).toEqual(["col:0:name"]);

		await canvas.shiftClickAt(await slotCenter(canvas, id, "col:2:name"));
		await expect
			.poll(async () => (await pickedSlotIds(canvas, id)).sort())
			.toEqual(["col:0:name", "col:1:name", "col:2:name"]);
	});

	test("moves a slot pick with the arrows and widens it with Shift+arrows, the entity staying put", async ({
		canvas,
	}) => {
		const id = await canvas.placeShapeFromFlyout(CATEGORY, PRESET);
		await canvas.clickAt(await slotCenter(canvas, id, "col:0:name"));
		await expect.poll(() => pickedSlotIds(canvas, id)).toEqual(["col:0:name"]);
		const boxBefore = await canvas.objectById(id).boundingBox();

		await canvas.page.keyboard.press("ArrowDown");
		await expect.poll(() => pickedSlotIds(canvas, id)).toEqual(["col:1:name"]);

		await canvas.page.keyboard.press("Shift+ArrowDown");
		await expect
			.poll(async () => (await pickedSlotIds(canvas, id)).sort())
			.toEqual(["col:1:name", "col:2:name"]);

		await canvas.page.keyboard.press("Shift+ArrowRight");
		await expect
			.poll(async () => (await pickedSlotIds(canvas, id)).sort())
			.toEqual(["col:1:name", "col:1:type", "col:2:name", "col:2:type"]);

		// At the right edge the key stays with the pick rather than nudging the
		// entity; the step afterwards proves it was handled.
		await canvas.page.keyboard.press("Shift+ArrowRight");
		await canvas.page.keyboard.press("Shift+ArrowUp");
		await expect
			.poll(async () => (await pickedSlotIds(canvas, id)).sort())
			.toEqual(["col:1:name", "col:1:type"]);

		expect(await canvas.objectById(id).boundingBox()).toEqual(boxBefore);
	});
});

test.describe("erEntity widening to fit its texts", () => {
	/**
	 * Opens the editor on one slot and replaces its text, leaving the editor
	 * open: the draft reaches the shape on every keystroke, so the box is
	 * measured mid-edit.
	 */
	async function startReplacingSlotText(
		canvas: CanvasDriver,
		objectId: string,
		slotId: string,
		text: string,
	): Promise<void> {
		const slot = await slotRect(canvas, objectId, slotId);
		await canvas.page.mouse.dblclick(
			slot.x + slot.width / 2,
			slot.y + slot.height / 2,
		);
		await canvas.waitForTextEditor();
		await canvas.page.keyboard.press("ControlOrMeta+a");
		await canvas.page.keyboard.type(text);
	}

	/** The first row's three slots and the box's left edge and width, in client pixels. */
	async function measureEntity(canvas: CanvasDriver, objectId: string) {
		const box = await canvas.objectById(objectId).boundingBox();
		if (box === null) {
			throw new Error(`entity ${objectId} is not drawn`);
		}
		return {
			left: box.x,
			width: box.width,
			key: await slotRect(canvas, objectId, "col:0:key"),
			name: await slotRect(canvas, objectId, "col:0:name"),
			type: await slotRect(canvas, objectId, "col:0:type"),
		};
	}

	test("widens the box while a column name outgrows its slot, the key gutter and the type kept", async ({
		canvas,
	}) => {
		const id = await canvas.placeShapeFromFlyout(CATEGORY, PRESET);
		await canvas.deselect();
		const before = await measureEntity(canvas, id);

		await startReplacingSlotText(
			canvas,
			id,
			"col:0:name",
			"a_rather_long_column_name_for_the_slot",
		);
		await expect
			.poll(async () => (await measureEntity(canvas, id)).width)
			.toBeGreaterThan(before.width + 60);
		const editing = await measureEntity(canvas, id);
		expect(editing.type.width).toBeCloseTo(before.type.width, 0);
		expect(editing.key.width).toBeCloseTo(before.key.width, 0);
		expect(editing.left).toBeCloseTo(before.left, 0);

		await canvas.commitText();
		await expect
			.poll(async () => (await drawnTexts(canvas, id)).join("|"))
			.toContain("a_rather_long_column_name_for_the_slot");
		const after = await measureEntity(canvas, id);
		expect(after.width).toBeCloseTo(editing.width, 0);
		expect(after.name.width).toBeGreaterThan(before.name.width + 60);
		expect(after.type.width).toBeCloseTo(before.type.width, 0);
		expect(after.key.width).toBeCloseTo(before.key.width, 0);
		expect(after.left).toBeCloseTo(before.left, 0);
		// Measured, never stated: the document keeps the width it was given, and
		// the drawing re-fits from the text on the next load.
		const saved = await savedObject(canvas, id);
		expect(saved.nameWidth).toBe(ER_ENTITY_DEFAULT_NAME_WIDTH);
		expect(saved.typeWidth).toBe(ER_ENTITY_DEFAULT_TYPE_WIDTH);
	});

	test("widens the box while a type outgrows its slot, the name kept", async ({
		canvas,
	}) => {
		const id = await canvas.placeShapeFromFlyout(CATEGORY, PRESET);
		await canvas.deselect();
		const before = await measureEntity(canvas, id);

		await startReplacingSlotText(
			canvas,
			id,
			"col:0:type",
			"varchar(255) not null default 'unknown'",
		);
		await expect
			.poll(async () => (await measureEntity(canvas, id)).width)
			.toBeGreaterThan(before.width + 60);
		const editing = await measureEntity(canvas, id);
		expect(editing.name.width).toBeCloseTo(before.name.width, 0);
		expect(editing.key.width).toBeCloseTo(before.key.width, 0);
		expect(editing.left).toBeCloseTo(before.left, 0);

		await canvas.commitText();
		await expect
			.poll(async () => (await drawnTexts(canvas, id)).join("|"))
			.toContain("not null default");
		const after = await measureEntity(canvas, id);
		expect(after.width).toBeCloseTo(editing.width, 0);
		expect(after.type.width).toBeGreaterThan(before.type.width + 60);
		expect(after.name.width).toBeCloseTo(before.name.width, 0);
		expect(after.left).toBeCloseTo(before.left, 0);
	});
});

test.describe("erEntity column insert from the properties sidebar", () => {
	/** The ids of the entity insertions the sidebar offers, in the order it draws them. */
	async function offeredInsertCommandIds(
		canvas: CanvasDriver,
	): Promise<string[]> {
		return canvas.page
			.locator(`${selectors.propertyPanel} [data-action^="command:erEntity."]`)
			.evaluateAll((buttons) =>
				buttons.map((button) =>
					(button.getAttribute("data-action") ?? "").replace(/^command:/, ""),
				),
			);
	}

	test("offers the append for the whole entity, and inserts above a picked column", async ({
		canvas,
	}) => {
		await canvas.openPropertyPanel();
		const id = await canvas.placeShapeFromFlyout(CATEGORY, PRESET);
		await expect
			.poll(() => offeredInsertCommandIds(canvas))
			.toEqual(["erEntity.appendColumn"]);

		await clickColumnGrip(canvas, 1);
		await expect
			.poll(() => offeredInsertCommandIds(canvas))
			.toEqual(["erEntity.insertColumnAbove", "erEntity.insertColumnBelow"]);

		await canvas.page.click(
			selectors.propertyPanelCommand("erEntity.insertColumnAbove"),
		);
		await typeIntoOpenEditor(canvas, "org_id");

		await expect.poll(() => columnCount(canvas, id)).toBe(4);
		const inserted = await slotRect(canvas, id, "col:1:name");
		const shifted = await slotRect(canvas, id, "col:2:name");
		expect(inserted.y).toBeLessThan(shifted.y);
		const saved = (await savedObject(canvas, id)) as {
			columns: { name: unknown }[];
		};
		expect(saved.columns[1].name).toBe("org_id");
	});
});

test.describe("erEntity lanes", () => {
	test("picks a lane by its grip, Ctrl adds another, a style lands on their slots and Delete empties them", async ({
		canvas,
	}) => {
		const id = await canvas.placeShapeFromFlyout(CATEGORY, PRESET);
		const typeGrip = grip(canvas, "laneGrip", "type");
		const keyGrip = grip(canvas, "laneGrip", "key");
		const unpickedFill = await gripFill(typeGrip);

		await clickGrip(canvas, typeGrip);
		await expect.poll(() => gripFill(typeGrip)).not.toBe(unpickedFill);
		expect(await gripFill(keyGrip)).toBe(unpickedFill);
		// One outline over the lane, from the first row down to the last.
		const outlines = await partOutlineRects(canvas);
		expect(outlines).toHaveLength(1);
		const firstType = await slotRect(canvas, id, "col:0:type");
		const lastType = await slotRect(canvas, id, "col:2:type");
		expect(outlines[0].x).toBeCloseTo(firstType.x, 0);
		expect(outlines[0].y).toBeCloseTo(firstType.y, 0);
		expect(outlines[0].y + outlines[0].height).toBeCloseTo(
			lastType.y + lastType.height,
			0,
		);

		await canvas.page.keyboard.press("ControlOrMeta+b");
		await expect
			.poll(async () => (await slotFont(canvas, id, "col:2:type")).fontWeight)
			.toBe("700");
		expect((await slotFont(canvas, id, "col:2:name")).fontWeight).not.toBe(
			"700",
		);

		await clickGrip(canvas, keyGrip, "ctrl");
		await expect.poll(() => gripFill(keyGrip)).not.toBe(unpickedFill);
		expect(await gripFill(typeGrip)).not.toBe(unpickedFill);

		await canvas.deleteSelection();
		await expect
			.poll(async () => (await drawnTexts(canvas, id)).join("|"))
			.not.toContain("varchar(100)");
		const texts = (await drawnTexts(canvas, id)).join("|");
		expect(texts).not.toContain("PK");
		expect(texts).toContain("created_at");
		await expect(canvas.objectById(id)).toHaveCount(1);
		expect(await columnCount(canvas, id)).toBe(3);
	});
});
