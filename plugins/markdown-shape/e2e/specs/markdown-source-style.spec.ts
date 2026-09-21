import type { CanvasDriver } from "@jiscribe/canvas-sdk/testing/e2e";
import { test, expect, selectors } from "@jiscribe/canvas-sdk/testing/e2e";

/**
 * A markdown card's body is Markdown source (`features.text: "source"`), so the
 * emphasis belongs to the syntax rather than to the shape: a stretch of the body
 * cannot be styled on its own, and bold / italic / the decoration lines are not
 * offered at all. What is left — the size, the color, the family, the alignment —
 * is the ground the whole rendered document is drawn on.
 *
 * The core suite checks the same rules on a shape that draws its source as plain
 * text (`specs/ui/text-source-style.spec.ts`); here they are checked through the
 * rendering the card actually puts on the canvas.
 */

/** A body whose rendering shows at once whether anything was emphasized. */
const SOURCE = "# Title\n\nplain body";

const CARD_BOUNDS = {
	from: { x: 400, y: 200 },
	to: { x: 700, y: 400 },
} as const;
const CARD_CENTER = { x: 550, y: 300 } as const;

/** The rendered body: its markup, and the type size the block is drawn at. */
async function renderedBody(
	canvas: CanvasDriver,
	id: string,
): Promise<{ html: string; fontSize: string }> {
	return canvas.page.evaluate((targetId) => {
		const shape = document.querySelector(`[data-id="${targetId}"]`);
		let sibling = shape?.nextElementSibling ?? null;
		while (sibling && sibling.tagName.toLowerCase() !== "foreignobject") {
			sibling = sibling.nextElementSibling;
		}
		const content = sibling?.firstElementChild?.firstElementChild;
		if (!(content instanceof HTMLElement)) {
			return { html: "", fontSize: "" };
		}
		return {
			html: content.innerHTML,
			fontSize: getComputedStyle(content).fontSize,
		};
	}, id);
}

/** Opens the editor on the card, leaving the body as it is. */
async function openEditor(canvas: CanvasDriver) {
	const center = canvas.toScreen(CARD_CENTER);
	await canvas.page.mouse.dblclick(center.x, center.y);
	await canvas.waitForTextEditor();
}

/** Opens the editor on the card and replaces its body, leaving the editor open. */
async function editBody(canvas: CanvasDriver, source: string) {
	await openEditor(canvas);
	await canvas.page.keyboard.press("Control+a");
	await canvas.page.keyboard.type(source);
}

/** Draws a card holding {@link SOURCE}, with the editor open on it. */
async function drawAndEditCard(canvas: CanvasDriver): Promise<string> {
	const id = await canvas.drawShape(
		"Markdown",
		CARD_BOUNDS.from,
		CARD_BOUNDS.to,
	);
	await canvas.deselect();
	await editBody(canvas, SOURCE);
	return id;
}

/** Selects the first `length` characters of the open editor. */
async function selectFromStart(canvas: CanvasDriver, length: number) {
	await canvas.page.keyboard.press("Home");
	for (let i = 0; i < length; i++) {
		await canvas.page.keyboard.press("Shift+ArrowRight");
	}
}

test.describe("styling a Markdown source body", () => {
	test("draws the same rendering after bold is pressed over a stretch of it", async ({
		canvas,
	}) => {
		const id = await drawAndEditCard(canvas);
		await canvas.commitText();
		await expect
			.poll(async () => (await renderedBody(canvas, id)).html)
			.toContain("<h1>");
		const before = await renderedBody(canvas, id);

		await openEditor(canvas);
		await selectFromStart(canvas, 2);
		await canvas.page.keyboard.press("ControlOrMeta+b");
		await canvas.commitText();

		const after = await renderedBody(canvas, id);
		expect(after).toEqual(before);
		// Nothing was emphasized: the card draws what the Markdown says, and the
		// source holds no `**`.
		expect(after.html).not.toContain("<strong>");

		// The body is also still one plain string: the editor draws a run list as
		// styled elements of its own, so a stretch committed as bold would show up
		// here even though the renderer flattens it away.
		await openEditor(canvas);
		const editorRuns = await canvas.drawnTextRuns(id);
		expect(editorRuns.length).toBeGreaterThan(0);
		expect(editorRuns.filter((run) => run.fontWeight !== "400")).toEqual([]);
	});

	test("offers no format toggles while the body is edited, the font items staying", async ({
		canvas,
	}) => {
		await drawAndEditCard(canvas);
		await selectFromStart(canvas, 2);

		await expect(canvas.page.locator(selectors.objectMenu)).toBeVisible();
		await expect(
			canvas.page.locator(selectors.objectMenuToggle("font-size")),
		).toBeVisible();
		// The four buttons are laid out flat while text is edited, so their absence
		// is the absence of the `set:` parts themselves.
		await expect(
			canvas.page.locator(
				'[data-id="object-menu"][data-part^="set:fontWeight:"]',
			),
		).toHaveCount(0);
		await expect(
			canvas.page.locator(selectors.objectMenuToggle("text-format")),
		).toHaveCount(0);
	});

	test("offers no format row in the properties sidebar, the other text rows staying", async ({
		canvas,
	}) => {
		const id = await drawAndEditCard(canvas);
		await canvas.commitText();
		await canvas.selectAt(canvas.toScreen(CARD_CENTER));
		await canvas.openPropertyPanel();

		await expect(
			canvas.page.locator(selectors.propertyPanelField("fontSize")),
		).toBeVisible();
		await expect(
			canvas.page.locator(selectors.propertyPanelSet("fontWeight", "bold")),
		).toHaveCount(0);
		await expect(
			canvas.page.locator(selectors.propertyPanelSet("textAlign", "left")),
		).toBeVisible();
		// The card is the one the rows are reading.
		expect(await canvas.objectById(id).count()).toBe(1);
	});

	test("resizes the whole document from the menu even with a stretch selected", async ({
		canvas,
	}) => {
		const id = await drawAndEditCard(canvas);
		await selectFromStart(canvas, 2);

		await canvas.openObjectMenu("font-size");
		await canvas.setNumberInput("fontSize", 40);
		await canvas.commitText();

		// The size lands on the shape rather than on the selected characters, so the
		// whole rendering is drawn against the new ground.
		await expect
			.poll(async () => (await renderedBody(canvas, id)).fontSize)
			.toBe("40px");
	});
});
