import { selectors } from "@jiscribe/canvas-sdk/testing/e2e";
import type { CanvasDriver } from "@jiscribe/canvas-sdk/testing/e2e";

/**
 * Readers for what a table actually draws, shared by this package's specs. They go
 * through the DOM rather than the canvas state on purpose: a table stores no size,
 * so a box the layout got right but the drawing ignored has to still fail.
 */

/** A rectangle in client pixels, as `getBoundingClientRect` reports it. */
export type ClientRect = {
	x: number;
	y: number;
	width: number;
	height: number;
};

/**
 * Where one cell is drawn, found by the `data-part` the drawing gives it.
 *
 * @param canvas - The driver for the page under test
 * @param objectId - The table's object id, as `captureObjects` reports it
 * @param cellId - The cell's slot id (`r0c1`), the id half of its `data-part`
 * @returns The cell's client rect; throws when the table or the cell is not drawn
 */
export async function cellRect(
	canvas: CanvasDriver,
	objectId: string,
	cellId: string,
): Promise<ClientRect> {
	return canvas.page.evaluate(
		([id, part]) => {
			const cell = document.querySelector(
				`[data-kind="object"][data-id="${id}"] [data-part="textSlot:${part}"]`,
			);
			if (cell === null) {
				throw new Error(`no cell ${part} on ${id}`);
			}
			const box = cell.getBoundingClientRect();
			return { x: box.x, y: box.y, width: box.width, height: box.height };
		},
		[objectId, cellId] as const,
	);
}

/**
 * The content coordinate at the middle of one cell, which is where a click picks
 * that cell.
 *
 * @param canvas - The driver for the page under test
 * @param objectId - The table's object id
 * @param cellId - The cell's slot id (`r0c1`)
 * @returns The point in content coordinates, ready for clickAt / typeTextAt
 */
export async function cellCenter(
	canvas: CanvasDriver,
	objectId: string,
	cellId: string,
): Promise<{ x: number; y: number }> {
	const cell = await cellRect(canvas, objectId, cellId);
	return canvas.toContent({
		x: cell.x + cell.width / 2,
		y: cell.y + cell.height / 2,
	});
}

/**
 * The color one cell's own surface is painted with, read off the computed style
 * of the rect its `data-part` names — the paint comes from emotion CSS, not an
 * SVG attribute.
 *
 * @param canvas - The driver for the page under test
 * @param objectId - The table's object id
 * @param cellId - The cell's slot id (`r0c1`)
 * @returns The computed `fill`, browser-normalized; `rgba(0, 0, 0, 0)` for a cell painting nothing of its own. Throws when the cell is not drawn
 */
export async function cellFillColor(
	canvas: CanvasDriver,
	objectId: string,
	cellId: string,
): Promise<string> {
	return canvas.page.evaluate(
		([id, part]) => {
			const cell = document.querySelector(
				`[data-kind="object"][data-id="${id}"] [data-part="textSlot:${part}"]`,
			);
			if (cell === null) {
				throw new Error(`no cell ${part} on ${id}`);
			}
			return getComputedStyle(cell).fill;
		},
		[objectId, cellId] as const,
	);
}

/**
 * The color the table's own background is painted with — the rect the table
 * draws first, under every cell (TableBody).
 *
 * @param canvas - The driver for the page under test
 * @param objectId - The table's object id
 * @returns The computed `fill`, browser-normalized; throws when the table draws no rect at all
 */
export async function tableBodyFillColor(
	canvas: CanvasDriver,
	objectId: string,
): Promise<string> {
	return canvas.page.evaluate((id) => {
		const body = document.querySelector(
			`[data-kind="object"][data-id="${id}"] rect`,
		);
		if (body === null) {
			throw new Error(`object ${id} draws no rect`);
		}
		return getComputedStyle(body).fill;
	}, objectId);
}

/**
 * How many cells the table draws, which is its grid's size — rows times columns,
 * counted off the drawing rather than the state.
 *
 * @param canvas - The driver for the page under test
 * @param objectId - The table's object id; an id nothing is drawn for counts 0
 * @returns The number of cell elements, found by the `textSlot:r<row>c<column>` address they carry
 */
export async function cellCount(
	canvas: CanvasDriver,
	objectId: string,
): Promise<number> {
	return canvas.page.evaluate(
		(id) =>
			document.querySelectorAll(
				`[data-kind="object"][data-id="${id}"] [data-part^="textSlot:r"]`,
			).length,
		objectId,
	);
}

/**
 * The grip for one track, by the `data-action` its control gives it.
 *
 * @param canvas - The driver for the page under test
 * @param axis - Which strip of grips to look in: the rows down the left or the columns across the top
 * @param trackIndex - The track's 0-based index, which is the part's trailing segment
 * @returns A locator for the grip's pressable rect (the drawn cell is `trackGripFace`), which may match nothing when the table is not the sole selection
 */
export function trackGrip(
	canvas: CanvasDriver,
	axis: "rowGrip" | "columnGrip",
	trackIndex: number,
) {
	return canvas.page.locator(
		`[data-kind="control"][data-action="selection:table:${axis}:${trackIndex}"]`,
	);
}

/**
 * The drawn cell of one track's grip: the painted rect behind the pressable one
 * `trackGrip` finds, which carries the fill and abuts the table.
 *
 * @param canvas - The driver for the page under test
 * @param axis - Which strip of grips to look in
 * @param trackIndex - The track's 0-based index
 * @returns A locator for the cell's rect, resolved relative to the control that names the track
 */
export function trackGripFace(
	canvas: CanvasDriver,
	axis: "rowGrip" | "columnGrip",
	trackIndex: number,
) {
	// SVG elements sit in their own namespace, which a bare XPath name never matches.
	return trackGrip(canvas, axis, trackIndex).locator(
		"xpath=../preceding-sibling::*[local-name()='g'][1]/*[local-name()='rect']",
	);
}

/**
 * The heading drawn on one track's grip: `1`, `2`… for rows, `A`, `B`… for columns.
 *
 * @param canvas - The driver for the page under test
 * @param axis - Which strip of grips to look in
 * @param trackIndex - The track's 0-based index
 * @returns A locator for the text element, resolved relative to the control that names the track
 */
export function trackGripLabel(
	canvas: CanvasDriver,
	axis: "rowGrip" | "columnGrip",
	trackIndex: number,
) {
	return trackGrip(canvas, axis, trackIndex).locator(
		"xpath=../preceding-sibling::*[local-name()='text'][1]",
	);
}

/**
 * Clicks one track's grip at its middle, which selects the whole track — or,
 * with a modifier held, grows or trims the tracks already picked.
 *
 * @param canvas - The driver for the page under test
 * @param axis - Which strip of grips to click in
 * @param trackIndex - The track's 0-based index; throws when the table is not selected and the grips are not drawn
 * @param modifier - The key held through the click: `"shift"` runs the pick to this track, `"ctrl"` adds it or takes it out; omitted for a plain click
 */
export async function clickTrackGrip(
	canvas: CanvasDriver,
	axis: "rowGrip" | "columnGrip",
	trackIndex: number,
	modifier?: "shift" | "ctrl",
): Promise<void> {
	const box = await trackGrip(canvas, axis, trackIndex).boundingBox();
	if (box === null) {
		throw new Error(`no ${axis} ${trackIndex}`);
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
 * Alt+Shift plus an arrow: inserts an empty track on that side of the picked
 * cell or track, the picked one staying picked. Keyboard shortcuts run
 * synchronously on keydown, so what follows only has to wait for React to
 * commit — which a poll on the result does.
 *
 * @param canvas - The driver for the page under test; a cell or a track of the table has to be picked, or the keys insert nothing
 * @param arrow - The side the new track goes on: up / down insert a row, left / right a column
 */
export async function pressInsertTrack(
	canvas: CanvasDriver,
	arrow: "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight",
): Promise<void> {
	await canvas.page.keyboard.press(`Alt+Shift+${arrow}`);
}

/**
 * Whether the element at an edge's resize handle centre is the handle itself,
 * which is whether a press there resizes the table rather than reaching a strip or
 * grip drawn at the same spot.
 *
 * @param canvas - The driver for the page under test; the table has to be selected
 * @param handle - Which edge's middle handle; the corners sit clear of every strip. Throws when it is not drawn
 * @returns True when the handle is the topmost element at its own centre
 */
export async function isResizeHandleOnTop(
	canvas: CanvasDriver,
	handle: "leftCenter" | "rightCenter" | "topCenter" | "bottomCenter",
): Promise<boolean> {
	const control = canvas.page.locator(selectors.transformControl(handle));
	await control.waitFor();
	return control.evaluate((element) => {
		const rect = element.getBoundingClientRect();
		return (
			document.elementFromPoint(
				rect.x + rect.width / 2,
				rect.y + rect.height / 2,
			) === element
		);
	});
}

/**
 * Where one piece of drawn text sits, in client px: the middle of the innermost
 * element holding exactly that text. Found by the text rather than by a
 * `data-part`, the slot overlays carrying none.
 *
 * @param canvas - The driver for the page under test
 * @param text - The text to find, matched against the trimmed content of an element; throws when nothing is drawn with exactly it
 * @returns The centre of its box, in client px
 */
export async function drawnTextCenter(
	canvas: CanvasDriver,
	text: string,
): Promise<{ x: number; y: number }> {
	const center = await canvas.page.evaluate((wanted) => {
		const holder = [...document.querySelectorAll("*")]
			.reverse()
			.find((element) => element.textContent?.trim() === wanted);
		if (holder === undefined) {
			return null;
		}
		const box = holder.getBoundingClientRect();
		return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
	}, text);
	if (center === null) {
		throw new Error(`"${text}" is not drawn`);
	}
	return center;
}

/**
 * The weight one piece of drawn text is rendered with, read off the innermost
 * element holding exactly that text — the same element {@link drawnTextCenter}
 * finds it by.
 *
 * @param canvas - The driver for the page under test
 * @param text - The text to find, matched against the trimmed content of an element; throws when nothing is drawn with exactly it
 * @returns The computed `font-weight`, browser-normalized (`"700"` for bold)
 */
export async function drawnTextWeight(
	canvas: CanvasDriver,
	text: string,
): Promise<string> {
	const weight = await canvas.page.evaluate((wanted) => {
		const holder = [...document.querySelectorAll("*")]
			.reverse()
			.find((element) => element.textContent?.trim() === wanted);
		return holder === undefined ? null : getComputedStyle(holder).fontWeight;
	}, text);
	if (weight === null) {
		throw new Error(`"${text}" is not drawn`);
	}
	return weight;
}

/**
 * The lines one piece of drawn text is decorated with, read off the innermost
 * element holding exactly that text — the same element {@link drawnTextWeight}
 * reads.
 *
 * @param canvas - The driver for the page under test
 * @param text - The text to find, matched against the trimmed content of an element; throws when nothing is drawn with exactly it
 * @returns The computed `text-decoration-line` (`"none"` / `"underline"` / `"underline line-through"`); not inherited, so it is the line set on that element itself
 */
export async function drawnTextDecoration(
	canvas: CanvasDriver,
	text: string,
): Promise<string> {
	const decoration = await canvas.page.evaluate((wanted) => {
		const holder = [...document.querySelectorAll("*")]
			.reverse()
			.find((element) => element.textContent?.trim() === wanted);
		return holder === undefined
			? null
			: getComputedStyle(holder).textDecorationLine;
	}, text);
	if (decoration === null) {
		throw new Error(`"${text}" is not drawn`);
	}
	return decoration;
}

/**
 * The boxes the selection overlay draws around selected sub-parts, one per part
 * (SelectionOverlay). The table's own outline is not among them: it is left out
 * while a part is outlined, so compare against tableOutlineRect instead.
 *
 * @param canvas - The driver for the page under test
 * @returns The boxes' client rects, in the order the overlay draws them; empty
 *   while only the table itself is selected
 */
export async function partOutlineRects(
	canvas: CanvasDriver,
): Promise<ClientRect[]> {
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
 * Where the grid's outline is drawn — the rect the table draws last, around every
 * cell — which is the table's own edges as a viewer sees them.
 *
 * @param canvas - The driver for the page under test
 * @param objectId - The table's object id
 * @returns The outline's client rect; throws when the table draws no rect at all
 */
export async function tableOutlineRect(
	canvas: CanvasDriver,
	objectId: string,
): Promise<ClientRect> {
	return canvas.page.evaluate((id) => {
		const group = document.querySelector(
			`[data-kind="object"][data-id="${id}"]`,
		);
		if (group === null) {
			throw new Error(`no object ${id}`);
		}
		const outline = [...group.querySelectorAll("rect")].at(-1);
		if (outline === undefined) {
			throw new Error(`object ${id} draws no rect`);
		}
		const box = outline.getBoundingClientRect();
		return { x: box.x, y: box.y, width: box.width, height: box.height };
	}, objectId);
}

/**
 * Which cells the selection overlay has boxes over, identified by matching each
 * box against the cell it sits on. The overlay's rects carry no `data-part` of
 * their own, so identity has to come from the drawing: a cell's box and the
 * outline over it share a centre.
 *
 * @param canvas - The driver for the page under test
 * @param objectId - The table's object id; its cells are the only ones matched against
 * @returns The cell ids in the order the overlay draws them, which is the order
 *   the part selection holds them in; empty when only the table itself is
 *   outlined. Throws when an outline sits over no cell of this table, that being
 *   a selection this reader cannot report rather than one it may drop
 */
export async function selectedCellIds(
	canvas: CanvasDriver,
	objectId: string,
): Promise<string[]> {
	return canvas.page.evaluate(
		({ id, partOutlineSelector }) => {
			const cells = [
				...document.querySelectorAll(
					`[data-kind="object"][data-id="${id}"] [data-part^="textSlot:r"]`,
				),
			].map((cell) => ({
				cellId: (cell.getAttribute("data-part") ?? "").replace("textSlot:", ""),
				box: cell.getBoundingClientRect(),
			}));
			return [...document.querySelectorAll(partOutlineSelector)].map(
				(outline) => {
					const box = outline.getBoundingClientRect();
					const x = box.x + box.width / 2;
					const y = box.y + box.height / 2;
					const found = cells.find(
						(cell) =>
							x >= cell.box.x &&
							x <= cell.box.x + cell.box.width &&
							y >= cell.box.y &&
							y <= cell.box.y + cell.box.height,
					);
					if (found === undefined) {
						throw new Error(`a selection outline sits over no cell of ${id}`);
					}
					return found.cellId;
				},
			);
		},
		{ id: objectId, partOutlineSelector: selectors.partOutline },
	);
}

/**
 * Types `text` into one cell and commits it, the way a person double-clicking
 * the cell would. It needs no selection of its own, and leaves nothing selected:
 * committing clicks empty space.
 *
 * @param canvas - The driver for the page under test
 * @param objectId - The table's object id, as `captureObjects` reports it
 * @param cellId - The cell's slot id (`r0c1`); its drawn middle is where the edit opens
 * @param text - Typed as keystrokes after what the cell already holds (the editor opens with the caret at the end)
 */
export async function fillCell(
	canvas: CanvasDriver,
	objectId: string,
	cellId: string,
	text: string,
): Promise<void> {
	await canvas.typeTextAt(await cellCenter(canvas, objectId, cellId), text);
	await canvas.commitText();
}

/**
 * Whether `text` is drawn inside one cell, judged by where its middle falls.
 *
 * @param canvas - The driver for the page under test
 * @param objectId - The table's object id, as `captureObjects` reports it
 * @param text - Matched as the page's first element showing it, so it should be unique on the page
 * @param cellId - The cell's slot id (`r0c1`)
 * @returns false when the text is not drawn at all; throws when the cell is not drawn
 */
export async function isTextDrawnInCell(
	canvas: CanvasDriver,
	objectId: string,
	text: string,
	cellId: string,
): Promise<boolean> {
	const textBox = await canvas.page.getByText(text).first().boundingBox();
	if (textBox === null) {
		return false;
	}
	const cell = await cellRect(canvas, objectId, cellId);
	const textCenterX = textBox.x + textBox.width / 2;
	const textCenterY = textBox.y + textBox.height / 2;
	return (
		textCenterX > cell.x &&
		textCenterX < cell.x + cell.width &&
		textCenterY > cell.y &&
		textCenterY < cell.y + cell.height
	);
}
