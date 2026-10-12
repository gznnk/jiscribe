import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * Content-box top and height of an element, in viewport px. The two text boxes
 * carry the same padding, so comparing content boxes compares where the first
 * line actually starts.
 */
async function contentBoxOf(
	locator: ReturnType<CanvasDriver["page"]["locator"]>,
): Promise<{ top: number; height: number }> {
	return locator.evaluate((el) => {
		const rect = el.getBoundingClientRect();
		const style = getComputedStyle(el);
		const paddingTop = parseFloat(style.paddingTop);
		return {
			top: rect.top + parseFloat(style.borderTopWidth) + paddingTop,
			height: rect.height - paddingTop - parseFloat(style.paddingBottom),
		};
	});
}

/** The div a TextOverlay draws its text in (foreignObject > wrapper > content). */
function displayTextOf(canvas: CanvasDriver) {
	return canvas.page.locator("foreignObject > div > div").first();
}

/**
 * Whether each outline rect in the selection overlay is dashed, in drawing order:
 * the object's own outline first, a picked part's box after it.
 */
async function selectionOutlines(canvas: CanvasDriver): Promise<boolean[]> {
	return canvas.page.evaluate(() =>
		[...document.querySelectorAll('[data-layer="selection-overlay"] rect')].map(
			(rect) => rect.getAttribute("stroke-dasharray") !== null,
		),
	);
}

/** How many resize/rotation handles are on screen; they all carry data-id="transform". */
async function transformHandleCount(canvas: CanvasDriver): Promise<number> {
	const controlIds = await canvas.visibleControlIds();
	return controlIds.filter((controlId) => controlId.startsWith("transform/"))
		.length;
}

test.describe("text editing", () => {
	test("edits on double click and commits on an outside click", async ({
		canvas,
	}) => {
		await canvas.drawShape("Rectangle", { x: 400, y: 200 }, { x: 600, y: 320 });
		await canvas.deselect();

		await canvas.typeTextAt({ x: 500, y: 260 }, "Hello Canvas");
		await canvas.commitText();

		await expect(canvas.page.locator("body")).toContainText("Hello Canvas");
	});

	test("cancels on Escape and does not save the text", async ({ canvas }) => {
		await canvas.drawShape("Rectangle", { x: 400, y: 200 }, { x: 600, y: 320 });
		await canvas.deselect();

		await canvas.typeTextAt({ x: 500, y: 260 }, "Discarded");
		await canvas.cancelText();

		await expect(canvas.page.locator("body")).not.toContainText("Discarded");
	});

	test("outlines the body while it is edited, and steps out one Escape at a time", async ({
		canvas,
	}) => {
		await canvas.drawShape("Rectangle", { x: 400, y: 200 }, { x: 600, y: 320 });
		await canvas.deselect();
		await canvas.typeTextAt({ x: 500, y: 260 }, "Kept out");

		// The body is picked like a compartment: its own box over a dashed outline.
		await expect.poll(() => selectionOutlines(canvas)).toEqual([true, false]);
		expect(await transformHandleCount(canvas)).toBe(0);

		// The first Escape leaves the editor, the body staying picked.
		await canvas.cancelText();
		expect(await selectionOutlines(canvas)).toEqual([true, false]);
		expect(await transformHandleCount(canvas)).toBe(0);

		// The second drops the body, back to the shape alone.
		await canvas.pressEscape();
		await expect.poll(() => selectionOutlines(canvas)).toEqual([false]);
		expect(await transformHandleCount(canvas)).toBeGreaterThan(0);

		// The third deselects it.
		await canvas.pressEscape();
		await expect.poll(() => canvas.hasAnyControl()).toBe(false);
	});

	test("accepts multi-line text", async ({ canvas }) => {
		await canvas.drawShape("Rectangle", { x: 400, y: 200 }, { x: 650, y: 360 });
		await canvas.deselect();

		await canvas.typeTextAt({ x: 525, y: 280 }, "Line One\nLine Two");
		await canvas.commitText();

		const body = canvas.page.locator("body");
		await expect(body).toContainText("Line One");
		await expect(body).toContainText("Line Two");
	});

	// Chrome lays a pasted multi-line text out as one block per line, an empty line
	// being a block holding nothing but a placeholder <br>. Both the block boundary
	// and that <br> stand at the same line end, and counting them both read one
	// blank line as two.
	test("keeps a pasted blank line to one blank line", async ({ canvas }) => {
		await canvas.drawShape("Rectangle", { x: 400, y: 180 }, { x: 660, y: 400 });
		await canvas.deselect();
		await canvas.typeTextAt({ x: 530, y: 290 }, "");

		// A real paste: the editor takes the text off the event and inserts it as
		// plain text, which is the multi-line insert Chrome builds the blocks for.
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
		}, "first\n\nlast");

		await expect.poll(() => canvas.textEditorText()).toBe("first\n\nlast");
		await canvas.commitText();

		await canvas.typeTextAt({ x: 530, y: 290 }, "");
		expect(await canvas.textEditorText()).toBe("first\n\nlast");
	});

	// VS Code's webview hands a paste to the page as document.execCommand("paste"),
	// so the paste event fires from inside that call, and Chrome refuses any
	// execCommand nested in a running one. That is emulated by dispatching the
	// paste from the input event of an execCommand of the test's own, the one
	// place a page script can stand inside a running execCommand.
	test("inserts a paste dispatched from inside execCommand", async ({
		canvas,
	}) => {
		await canvas.drawShape("Rectangle", { x: 400, y: 180 }, { x: 660, y: 400 });
		await canvas.deselect();
		await canvas.typeTextAt({ x: 530, y: 290 }, "");

		await canvas.textEditorSurface().evaluate((surface, pasted) => {
			surface.addEventListener(
				"input",
				() => {
					const clipboardData = new DataTransfer();
					clipboardData.setData("text/plain", pasted);
					surface.dispatchEvent(
						new ClipboardEvent("paste", {
							clipboardData,
							bubbles: true,
							cancelable: true,
						}),
					);
				},
				{ once: true },
			);
			surface.ownerDocument.execCommand("insertText", false, "typed ");
		}, "pasted");

		await expect.poll(() => canvas.textEditorText()).toBe("typed pasted");
	});

	// A line box is fontSize × 1.5 tall, so an odd size makes the drawn box end on
	// a half pixel. The editing surface has to end on the same one: a box rounded
	// to whole pixels moves vertically centered text the moment editing starts.
	for (const fontSize of [15, 21]) {
		test(`opens the editor on the text at font size ${fontSize}`, async ({
			canvas,
		}) => {
			await canvas.drawShape(
				"Rectangle",
				{ x: 400, y: 200 },
				{ x: 640, y: 320 },
			);
			await canvas.deselect();
			await canvas.typeTextAt({ x: 520, y: 260 }, "Hello Canvas");
			await canvas.commitText();

			await canvas.selectAt({ x: 520, y: 260 });
			await canvas.openObjectMenu("font-size");
			await canvas.setNumberInput("fontSize", fontSize);
			await canvas.deselect();

			const display = await contentBoxOf(displayTextOf(canvas));
			await canvas.typeTextAt({ x: 520, y: 260 }, "");
			const editor = await contentBoxOf(canvas.textEditorSurface());

			expect(editor).toEqual(display);
		});
	}
});
