import { test, expect, selectors } from "@jiscribe/canvas-sdk/testing/e2e";
import type { CanvasDriver } from "@jiscribe/canvas-sdk/testing/e2e";
import type { Locator } from "@playwright/test";

import { insertBadge, tableOutlineRect, trackGrip } from "../support/tableDom";
import type { ClientRect } from "../support/tableDom";

/**
 * The theme's distance from an edge to its connection-anchor dot's centre, in
 * client px at zoom 1 (`handleDimensions.connectionAnchorOffset`).
 */
const DEFAULT_ANCHOR_OFFSET = 20;

/**
 * The connection-anchor dots of a selected table, in a real browser: the two
 * edges lined with grips and `+` badges (top and left) push their dot out past
 * them, so a press meant for one never lands on the other, while the two bare
 * edges keep the theme's distance.
 */

async function rectOf(locator: Locator, name: string): Promise<ClientRect> {
	const box = await locator.boundingBox();
	if (box === null) {
		throw new Error(`no ${name} drawn`);
	}
	return box;
}

function anchorRect(canvas: CanvasDriver, anchorId: string) {
	return rectOf(
		canvas.page.locator(selectors.createAnchor(anchorId)),
		`anchor ${anchorId}`,
	);
}

function overlaps(first: ClientRect, second: ClientRect): boolean {
	return (
		first.x < second.x + second.width &&
		second.x < first.x + first.width &&
		first.y < second.y + second.height &&
		second.y < first.y + first.height
	);
}

test.describe("table connection anchors", () => {
	test("keeps the top anchor clear of the column grips and badges", async ({
		canvas,
	}) => {
		// Placed and left selected, which is when the anchors are drawn. A fresh table is 2x2.
		await canvas.placeShape("Table");
		const anchor = await anchorRect(canvas, "topCenter");

		const controls = [
			await rectOf(trackGrip(canvas, "columnGrip", 0), "column grip 0"),
			await rectOf(trackGrip(canvas, "columnGrip", 1), "column grip 1"),
			await rectOf(insertBadge(canvas, "columnInsert", 0), "badge 0"),
			await rectOf(insertBadge(canvas, "columnInsert", 1), "badge 1"),
			await rectOf(insertBadge(canvas, "columnInsert", 2), "badge 2"),
		];
		for (const control of controls) {
			expect(overlaps(anchor, control)).toBe(false);
		}
	});

	test("keeps the left anchor clear of the row grips and badges", async ({
		canvas,
	}) => {
		await canvas.placeShape("Table");
		const anchor = await anchorRect(canvas, "leftCenter");

		const controls = [
			await rectOf(trackGrip(canvas, "rowGrip", 0), "row grip 0"),
			await rectOf(trackGrip(canvas, "rowGrip", 1), "row grip 1"),
			await rectOf(insertBadge(canvas, "rowInsert", 0), "badge 0"),
			await rectOf(insertBadge(canvas, "rowInsert", 1), "badge 1"),
			await rectOf(insertBadge(canvas, "rowInsert", 2), "badge 2"),
		];
		for (const control of controls) {
			expect(overlaps(anchor, control)).toBe(false);
		}
	});

	test("leaves the bottom and right anchors at the theme's distance", async ({
		canvas,
	}) => {
		const id = await canvas.placeShape("Table");
		const box = await tableOutlineRect(canvas, id);

		const bottom = await anchorRect(canvas, "bottomCenter");
		const right = await anchorRect(canvas, "rightCenter");

		expect(
			Math.abs(
				bottom.y +
					bottom.height / 2 -
					(box.y + box.height) -
					DEFAULT_ANCHOR_OFFSET,
			),
		).toBeLessThanOrEqual(1);
		expect(
			Math.abs(
				right.x + right.width / 2 - (box.x + box.width) - DEFAULT_ANCHOR_OFFSET,
			),
		).toBeLessThanOrEqual(1);
	});
});
