import { test, expect, selectors } from "@jiscribe/canvas-sdk/testing/e2e";
import type { CanvasDriver } from "@jiscribe/canvas-sdk/testing/e2e";
import type { Locator } from "@playwright/test";

import { insertBadge, trackGrip } from "../support/tableDom";
import type { ClientRect } from "../support/tableDom";

/**
 * The connection-anchor dots of a selected table, in a real browser: every edge
 * is lined with a control — grips on the top and left, `+` badges on the bottom
 * and right — and pushes its dot out past them, so a press meant for one never
 * lands on the other.
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
	test("keeps the top anchor clear of the column grips", async ({ canvas }) => {
		// Placed and left selected, which is when the anchors are drawn. A fresh table is 2x2.
		await canvas.placeShape("Table");
		const anchor = await anchorRect(canvas, "topCenter");

		const controls = [
			await rectOf(trackGrip(canvas, "columnGrip", 0), "column grip 0"),
			await rectOf(trackGrip(canvas, "columnGrip", 1), "column grip 1"),
		];
		for (const control of controls) {
			expect(overlaps(anchor, control)).toBe(false);
		}
	});

	test("keeps the left anchor clear of the row grips", async ({ canvas }) => {
		await canvas.placeShape("Table");
		const anchor = await anchorRect(canvas, "leftCenter");

		const controls = [
			await rectOf(trackGrip(canvas, "rowGrip", 0), "row grip 0"),
			await rectOf(trackGrip(canvas, "rowGrip", 1), "row grip 1"),
		];
		for (const control of controls) {
			expect(overlaps(anchor, control)).toBe(false);
		}
	});

	test("keeps the bottom anchor clear of the column badges", async ({
		canvas,
	}) => {
		await canvas.placeShape("Table");
		const anchor = await anchorRect(canvas, "bottomCenter");

		const controls = [
			await rectOf(insertBadge(canvas, "columnInsert", 0), "badge 0"),
			await rectOf(insertBadge(canvas, "columnInsert", 1), "badge 1"),
			await rectOf(insertBadge(canvas, "columnInsert", 2), "badge 2"),
		];
		for (const control of controls) {
			expect(overlaps(anchor, control)).toBe(false);
		}
	});

	test("keeps the right anchor clear of the row badges", async ({ canvas }) => {
		await canvas.placeShape("Table");
		const anchor = await anchorRect(canvas, "rightCenter");

		const controls = [
			await rectOf(insertBadge(canvas, "rowInsert", 0), "badge 0"),
			await rectOf(insertBadge(canvas, "rowInsert", 1), "badge 1"),
			await rectOf(insertBadge(canvas, "rowInsert", 2), "badge 2"),
		];
		for (const control of controls) {
			expect(overlaps(anchor, control)).toBe(false);
		}
	});
});
