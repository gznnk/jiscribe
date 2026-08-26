import type { Page } from "@playwright/test";

import { test, expect } from "../../fixtures";

/**
 * Colour validity at the paste boundary.
 *
 * `isClipboardData` asks two independent questions of every colour: is it safe to
 * put in a CSS context (`isCssSafeValue`), and is it a colour at all (`isCssColor`
 * = `CSS.supports`). The second is browser-only, so it cannot be reached from the
 * node unit suite — this is where it is covered.
 *
 * Pasting is driven by writing to the OS clipboard directly, because that is the
 * only path `isClipboardData` guards; Ctrl+C fills the internal clipboard, which is
 * trusted and bypasses it. The canvas is left with nothing copied, so a rejected
 * paste has no internal clipboard to fall back to and nothing is added.
 */

/**
 * One well-formed clipboard payload holding a single rect, with the given fill.
 *
 * The object is spelled out exactly as CopyCommand writes it — every style field,
 * the text slot and the `features` table included — because `isClipboardData`
 * delegates to the per-type state validator, which rejects anything short of a
 * complete state. Trimming this down to "the fields that look necessary" makes the
 * paste fail for the wrong reason, and then a test asserting "nothing was pasted"
 * passes while proving nothing.
 */
const clipboardPayloadWithFill = (fill: string): string =>
	JSON.stringify({
		__type: "jiscribe-canvas-clipboard",
		version: 1,
		objects: {
			"pasted-1": {
				id: "pasted-1",
				type: "rect",
				stroke: "auto",
				strokeWidth: 2,
				fill,
				rx: 0,
				text: {
					body: {
						text: "",
						textAlign: "center",
						verticalAlign: "middle",
						fontColor: "auto",
						fontSize: 16,
						fontFamily: '"Source Sans 3", "Noto Sans JP", sans-serif',
						fontWeight: "normal",
					},
				},
				cx: 350,
				cy: 230,
				width: 100,
				height: 60,
				rotation: 0,
				scaleX: 1,
				scaleY: 1,
				features: {
					type: "rect",
					geometry: "rect",
					transform: true,
					stroke: true,
					fill: true,
					text: "body",
					radius: true,
					connectable: true,
				},
			},
		},
		rootIds: ["pasted-1"],
		center: { x: 350, y: 230 },
	});

const writeClipboard = async (page: Page, text: string): Promise<void> => {
	await page.evaluate(async (value) => {
		await navigator.clipboard.writeText(value);
	}, text);
};

test.describe("keyboard: paste rejects an invalid colour", () => {
	test("a payload whose fill is not a colour adds nothing", async ({
		canvas,
		page,
	}) => {
		// Draw first: the paste shortcut needs the canvas focused, and this also
		// proves the count moves when a paste does land (the tests below)
		await canvas.drawShape("Rectangle", { x: 300, y: 200 }, { x: 400, y: 260 });
		const before = (await canvas.captureObjects()).length;

		await writeClipboard(page, clipboardPayloadWithFill("notacolor"));
		await canvas.paste();

		// Give a successful paste time to land before concluding it did not
		await page.waitForTimeout(500);
		expect((await canvas.captureObjects()).length).toBe(before);
	});

	test("the same payload with a real colour is pasted", async ({
		canvas,
		page,
	}) => {
		await canvas.drawShape("Rectangle", { x: 300, y: 200 }, { x: 400, y: 260 });
		const before = (await canvas.captureObjects()).length;

		await writeClipboard(page, clipboardPayloadWithFill("#ff8a80"));
		await canvas.paste();

		await expect
			.poll(async () => (await canvas.captureObjects()).length)
			.toBe(before + 1);
	});

	test("the auto sentinel is pasted, being what shapes carry by default", async ({
		canvas,
		page,
	}) => {
		await canvas.drawShape("Rectangle", { x: 300, y: 200 }, { x: 400, y: 260 });
		const before = (await canvas.captureObjects()).length;

		await writeClipboard(page, clipboardPayloadWithFill("auto"));
		await canvas.paste();

		await expect
			.poll(async () => (await canvas.captureObjects()).length)
			.toBe(before + 1);
	});
});
