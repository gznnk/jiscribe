import type * as CanvasModule from "@jiscribe/canvas";
import { test, expect } from "@jiscribe/canvas-sdk/testing/e2e";
import type { Page } from "@playwright/test";

import {
	loadHarnessDoc,
	readCanvasHandle,
	readDrawnBodyBox,
} from "../support/harnessPage";

/**
 * `measure.textSlot` on a markdown card measures the body as it is drawn —
 * rendered to HTML and laid out in the overlay's frame — rather than as the
 * plain text it holds: headings are drawn larger and blocks carry margins, and
 * neither shows in a plain-text layout of the source.
 */

/** A document holding `root`, as the text the harness loads. */
const docTextOf = (root: readonly Record<string, unknown>[]): string =>
	JSON.stringify({ version: 1, root });

/** Measures the body of each id once every one of them is on the canvas. */
const measureBodies = async (
	page: Page,
	ids: readonly string[],
): Promise<(CanvasModule.TextSlotMeasurement | null)[]> => {
	const handle = await readCanvasHandle(page);
	await expect
		.poll(() =>
			handle.evaluate(
				(h, targetIds) =>
					targetIds.every((id) => h.measure.textSlot(id) !== null),
				ids,
			),
		)
		.toBe(true);
	return handle.evaluate(
		(h, targetIds) => targetIds.map((id) => h.measure.textSlot(id)),
		ids,
	);
};

const card = (
	id: string,
	text: string,
	size: { width: number; height: number },
	type = "markdown",
): Record<string, unknown> => ({
	id,
	type,
	x: 100,
	y: 100,
	...size,
	fontSize: 16,
	text,
});

const HEADING_AND_PARAGRAPHS =
	"# 見出し\n\nThe first paragraph of the card.\n\nThe second paragraph of the card.\n\nThe third paragraph of the card.";

test.describe("Markdown measurement", () => {
	test("reports a heading and paragraphs as clipped in a small card and as fitting in a large one", async ({
		canvas,
	}) => {
		await loadHarnessDoc(
			canvas.page,
			docTextOf([
				card("small", HEADING_AND_PARAGRAPHS, { width: 300, height: 80 }),
				card("large", HEADING_AND_PARAGRAPHS, { width: 300, height: 400 }),
			]),
		);
		const [small, large] = await measureBodies(canvas.page, ["small", "large"]);

		expect(small).toMatchObject({
			textSlotId: "body",
			lineCount: null,
			isOverflowing: true,
			regionSize: { width: 300, height: 80 },
		});
		expect(small!.textSize.height).toBeGreaterThan(80);

		expect(large).toMatchObject({ lineCount: null, isOverflowing: false });
		// Blocks fill the region's width; the height is the same body's either way.
		expect(large!.textSize.width).toBeCloseTo(300, 0);
		expect(large!.textSize.height).toBeCloseTo(small!.textSize.height, 0);
	});

	test("measures the same extent the browser gives the body drawn on screen", async ({
		canvas,
	}) => {
		// The measurement is taken off screen, in a frame of its own, so this is
		// the check that it is the drawn layout and not a near copy of it: the
		// on-screen content element's scroll extent, read after the same fonts
		// have settled, must match to the pixel scrollHeight rounds to.
		await loadHarnessDoc(
			canvas.page,
			docTextOf([
				card("clipped", HEADING_AND_PARAGRAPHS, { width: 300, height: 80 }),
				card("roomy", HEADING_AND_PARAGRAPHS, { width: 300, height: 400 }),
			]),
		);
		await canvas.page.evaluate(() => document.fonts.ready);
		const [clipped, roomy] = await measureBodies(canvas.page, [
			"clipped",
			"roomy",
		]);
		const drawnClipped = await readDrawnBodyBox(canvas.page, "clipped");
		const drawnRoomy = await readDrawnBodyBox(canvas.page, "roomy");

		expect(drawnClipped).not.toBeNull();
		expect(drawnRoomy).not.toBeNull();
		// scrollHeight is a whole px, the measurement a fraction of one.
		expect(
			Math.abs(clipped!.textSize.height - drawnClipped!.scrollHeight),
		).toBeLessThanOrEqual(1);
		expect(
			Math.abs(roomy!.textSize.height - drawnRoomy!.scrollHeight),
		).toBeLessThanOrEqual(1);
		expect(clipped!.textSize.width).toBeCloseTo(drawnClipped!.regionWidth, 0);
		expect(clipped!.regionSize.height).toBeCloseTo(
			drawnClipped!.regionHeight,
			0,
		);
		// The verdict is what a reader sees: the drawn body runs past the box that
		// clips it exactly where the measurement says it is clipped.
		expect(drawnClipped!.scrollHeight).toBeGreaterThan(
			drawnClipped!.regionHeight,
		);
		expect(drawnRoomy!.scrollHeight).toBeLessThanOrEqual(
			drawnRoomy!.regionHeight,
		);
	});

	test("catches what a plain-text layout of the source would let through", async ({
		canvas,
	}) => {
		// Three `#` lines are three lines of plain text — 3 × 24px plus padding,
		// inside 100px — so the same source in a rect fits. Drawn as markdown they
		// are three h1 headings at 1.6em with margins between them, which do not.
		const source = "# A\n# B\n# C";
		const size = { width: 300, height: 100 };
		await loadHarnessDoc(
			canvas.page,
			docTextOf([
				card("markdown", source, size),
				card("plain", source, size, "rect"),
			]),
		);
		const [markdown, plain] = await measureBodies(canvas.page, [
			"markdown",
			"plain",
		]);

		expect(plain).toMatchObject({ lineCount: 3, isOverflowing: false });
		expect(markdown).toMatchObject({ lineCount: null, isOverflowing: true });
	});
});
