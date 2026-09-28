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
 * @param cellId - The cell's slot id (`r0c1`), which is its `data-part`
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
				`[data-kind="object"][data-id="${id}"] [data-part="${part}"]`,
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
 * How many cells the table draws, which is its grid's size — rows times columns,
 * counted off the drawing rather than the state.
 *
 * @param canvas - The driver for the page under test
 * @param objectId - The table's object id; an id nothing is drawn for counts 0
 * @returns The number of cell elements, found by the `r<row>c<column>` part they carry
 */
export async function cellCount(
	canvas: CanvasDriver,
	objectId: string,
): Promise<number> {
	return canvas.page.evaluate(
		(id) =>
			document.querySelectorAll(
				`[data-kind="object"][data-id="${id}"] [data-part^="r"]`,
			).length,
		objectId,
	);
}

/**
 * The grip for one track, by the `data-part` its control gives it.
 *
 * @param canvas - The driver for the page under test
 * @param axis - Which strip of grips to look in: the rows down the left or the columns across the top
 * @param trackIndex - The track's 0-based index, which is the part's trailing segment
 * @returns A locator for the grip's rect, which may match nothing when the table is not the sole selection
 */
export function trackGrip(
	canvas: CanvasDriver,
	axis: "rowGrip" | "columnGrip",
	trackIndex: number,
) {
	return canvas.page.locator(
		`[data-kind="control"][data-part="selection:table:${axis}:${trackIndex}"]`,
	);
}

/**
 * Clicks one track's grip at its middle, which selects the whole track.
 *
 * @param canvas - The driver for the page under test
 * @param axis - Which strip of grips to click in
 * @param trackIndex - The track's 0-based index; throws when the table is not selected and the grips are not drawn
 */
export async function clickTrackGrip(
	canvas: CanvasDriver,
	axis: "rowGrip" | "columnGrip",
	trackIndex: number,
): Promise<void> {
	const box = await trackGrip(canvas, axis, trackIndex).boundingBox();
	if (box === null) {
		throw new Error(`no ${axis} ${trackIndex}`);
	}
	await canvas.clickAt(
		canvas.toContent({ x: box.x + box.width / 2, y: box.y + box.height / 2 }),
	);
}

/**
 * Every box the selection overlay draws, in order: the selected object's own
 * outline first, then one per selected sub-part (SelectionOverlay). Read off the
 * attributes rather than by visibility, an outline being a fill-less rect.
 *
 * @param canvas - The driver for the page under test
 * @returns The boxes in the object's local coordinates, as the overlay writes them
 */
export async function selectionOutlines(
	canvas: CanvasDriver,
): Promise<ClientRect[]> {
	return canvas.page.evaluate(() =>
		[...document.querySelectorAll('[data-layer="selection-overlay"] rect')].map(
			(rect) => ({
				x: Number(rect.getAttribute("x")),
				y: Number(rect.getAttribute("y")),
				width: Number(rect.getAttribute("width")),
				height: Number(rect.getAttribute("height")),
			}),
		),
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
