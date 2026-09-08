import type { CanvasHandle, TextSlotMeasurement } from "@jiscribe/canvas";
import type { CanvasDriver } from "@jiscribe/canvas-sdk/testing/e2e";
import { test, expect } from "@jiscribe/canvas-sdk/testing/e2e";

/**
 * Guards that `measure.textSlot` answers for a markdown card from what it
 * actually draws.
 *
 * The shared plain-text layout cannot be simulated onto this body: a heading, a
 * fenced block and the margins between them are none of them wrapped lines, and
 * simulating them reported a card that visibly fits as clipped. So the type
 * declares `textLayout: "own"` and its drawn box is read off the DOM instead —
 * which is also why an off-screen card has to be measurable, viewport culling
 * having dropped it from that DOM.
 */

/** Width every card here is drawn at, so its blocks all wrap the same way. */
const CARD_WIDTH = 880;

/** A heading, a paragraph, an eight-line fence and a closing paragraph. */
const MARKDOWN_BODY = [
	"# Deployment pipeline",
	"",
	"The build stage runs on every push to the release branch.",
	"",
	"```bash",
	"pnpm install --frozen-lockfile",
	"pnpm lint",
	"pnpm typecheck",
	"pnpm test",
	"pnpm build",
	"pnpm --filter @jiscribe/canvas test:e2e",
	"node scripts/publish.mjs --dry-run",
	'echo "released"',
	"```",
	"",
	"Every step has to pass before the next one starts.",
].join("\n");

type CardOptions = {
	/** Left edge in content coordinates; far past the viewport is how culling is provoked. */
	x?: number;
	height: number;
};

const cardDocText = ({ x = 120, height }: CardOptions): string =>
	JSON.stringify({
		version: 1,
		root: [
			{
				id: "card",
				type: "markdown",
				x,
				y: 120,
				width: CARD_WIDTH,
				height,
				text: MARKDOWN_BODY,
			},
			// A plain box holding the same source, to keep the simulated path in
			// view beside the drawn one.
			{
				id: "plain",
				type: "rect",
				x,
				y: 120 + height + 40,
				width: CARD_WIDTH,
				height,
				text: MARKDOWN_BODY,
			},
		],
	});

async function loadDoc(canvas: CanvasDriver, docText: string) {
	await canvas.page.evaluate((text) => {
		const hook = (
			window as unknown as { __setHarnessDoc?: (docText: string) => void }
		).__setHarnessDoc;
		if (!hook) {
			throw new Error(
				"__setHarnessDoc is undefined (harness hook not installed)",
			);
		}
		hook(text);
	}, docText);
}

/**
 * The slot measurement the mounted canvas reports, through the very handle a
 * host app would call. Null until the body has been drawn once.
 */
async function measureBody(
	canvas: CanvasDriver,
	id: string,
): Promise<TextSlotMeasurement | null> {
	return canvas.page.evaluate((targetId) => {
		const handle = (
			window as unknown as { __canvasHandle?: CanvasHandle | null }
		).__canvasHandle;
		if (!handle) {
			throw new Error(
				"__canvasHandle is undefined (harness hook not installed)",
			);
		}
		return handle.measure.textSlot(targetId);
	}, id);
}

/** Waits for the body to be drawn, then reports what it measured. */
async function measuredBody(
	canvas: CanvasDriver,
	id: string,
): Promise<TextSlotMeasurement> {
	await expect
		.poll(async () => (await measureBody(canvas, id)) !== null, {
			message: `"${id}" reports a measurement`,
		})
		.toBe(true);
	const measurement = await measureBody(canvas, id);
	if (measurement === null) {
		throw new Error(`"${id}" stopped measuring between the two reads`);
	}
	return measurement;
}

test.describe("measuring a markdown card", () => {
	test("reports a card with room for its blocks as fitting, and counts no lines", async ({
		canvas,
	}) => {
		await loadDoc(canvas, cardDocText({ height: 560 }));

		const measurement = await measuredBody(canvas, "card");

		expect(measurement.slotId).toBe("body");
		expect(measurement.lineCount).toBeNull();
		expect(measurement.regionSize).toEqual({
			width: CARD_WIDTH,
			height: 560,
		});
		expect(measurement.textSize.height).toBeLessThan(
			measurement.regionSize.height,
		);
		expect(measurement.isOverflowing).toBe(false);
	});

	test("reports a card too short for its blocks as clipped", async ({
		canvas,
	}) => {
		await loadDoc(canvas, cardDocText({ height: 60 }));

		const measurement = await measuredBody(canvas, "card");

		expect(measurement.lineCount).toBeNull();
		expect(measurement.textSize.height).toBeGreaterThan(
			measurement.regionSize.height,
		);
		expect(measurement.isOverflowing).toBe(true);
	});

	test("measures a card the viewport has scrolled far past", async ({
		canvas,
	}) => {
		await loadDoc(canvas, cardDocText({ x: 20000, height: 560 }));

		// Culling has dropped it from the DOM, so nothing is drawn there to read
		// until the measurement suspends culling for itself.
		await expect(canvas.objectById("card")).toHaveCount(0);

		const measurement = await measuredBody(canvas, "card");

		expect(measurement.lineCount).toBeNull();
		expect(measurement.isOverflowing).toBe(false);
	});

	test("keeps counting lines for a plain box holding the same source", async ({
		canvas,
	}) => {
		await loadDoc(canvas, cardDocText({ height: 560 }));

		const measurement = await measuredBody(canvas, "plain");

		// The rect lays the Markdown source out as the plain text it is, so every
		// authored newline is a line of its own and then some.
		expect(measurement.lineCount).toBeGreaterThanOrEqual(
			MARKDOWN_BODY.split("\n").length,
		);
	});
});
