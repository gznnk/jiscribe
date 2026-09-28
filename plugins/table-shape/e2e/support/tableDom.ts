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
