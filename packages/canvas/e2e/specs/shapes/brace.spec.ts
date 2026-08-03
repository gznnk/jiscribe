import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

const TIP_HANDLE = '[data-kind="control"][data-part="selection:brace:tip"]';

/** Reads the d attribute of the given brace's curve. */
async function bracePathD(
	canvas: CanvasDriver,
	id: string,
): Promise<string | null> {
	return canvas.page.evaluate((objectId) => {
		const el = document.querySelector(`[data-id="${objectId}"] path`);
		return el?.getAttribute("d") ?? null;
	}, id);
}

/**
 * Two seams end to end:
 * - the label is sized from its own text and placed *outside* the geometry box
 *   (calcBraceTextRegion), which no other shipped shape does
 * - the tip handle (selection:brace:tip) moves the tip along its edge and
 *   re-attaches it to another one, changing direction and tipPosition together
 */
test.describe("brace", () => {
	test("creates a g element from a drag", async ({ canvas }) => {
		const id = await canvas.drawShape(
			"Brace",
			{ x: 400, y: 200 },
			{ x: 430, y: 400 },
		);
		const created = (await canvas.captureObjects()).find(
			(obj) => obj.id === id,
		);
		// The brace root is <g data-kind="object"> (curve plus its grab areas).
		expect(created?.tag).toBe("g");
	});

	test("draws the label beyond the tip, outside the box", async ({
		canvas,
	}) => {
		await canvas.drawShape("Brace", { x: 400, y: 200 }, { x: 430, y: 400 });
		await canvas.deselect();

		// The tip of a left brace sits mid-way down the left edge; double-clicking
		// the box opens the editor for the body slot.
		await canvas.typeTextAt({ x: 415, y: 300 }, "doc layer");
		await canvas.commitText();

		await expect
			.poll(() => canvas.page.evaluate(() => document.body.textContent ?? ""))
			.toContain("doc layer");
	});

	test("moves the tip along its edge when the handle is dragged", async ({
		canvas,
	}) => {
		// 30x200 brace (content coordinates x=[400,430], y=[200,400]), so the
		// default left tip sits at (400, 300).
		const id = await canvas.drawShape(
			"Brace",
			{ x: 400, y: 200 },
			{ x: 430, y: 400 },
		);
		await expect(canvas.page.locator(TIP_HANDLE)).toBeVisible();
		const before = await bracePathD(canvas, id);
		expect(before).toBeTruthy();

		// Well left of the box so x stays the dominant axis: the edge is kept and
		// only the position moves, to a quarter down (local y = -50).
		await canvas.drag({ x: 400, y: 300 }, { x: 250, y: 250 });

		await expect
			.poll(async () => bracePathD(canvas, id), {
				message: "the curve follows the moved tip",
			})
			.not.toBe(before);
		// Local coordinates are centered, so the left edge is x=-15 and a quarter
		// down the 200px span is y=-50.
		expect(await bracePathD(canvas, id)).toContain("-15 -50");
	});

	test("re-attaches the tip to another edge when dragged across the axis", async ({
		canvas,
	}) => {
		const id = await canvas.drawShape(
			"Brace",
			{ x: 400, y: 200 },
			{ x: 430, y: 400 },
		);
		await expect(canvas.page.locator(TIP_HANDLE)).toBeVisible();

		// Straight up from the center: y becomes dominant, so the tip lands on the
		// top edge at the middle (local 0, -100).
		await canvas.drag({ x: 400, y: 300 }, { x: 415, y: 120 });

		await expect
			.poll(async () => bracePathD(canvas, id), {
				message: "the tip lands on the top edge",
			})
			.toContain("0 -100");
	});
});
