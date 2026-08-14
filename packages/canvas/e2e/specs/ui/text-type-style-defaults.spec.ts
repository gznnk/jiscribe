import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";
import { selectors } from "../../support/selectors";

/**
 * A hand-authored doc that names no text styling must be drawn with the styling
 * its object type declares, not with the type-agnostic fallback the shared
 * overlay carries. The `text` type is the case that differs: it defaults to
 * left / top where the fallback is center / middle.
 *
 * Both surfaces are asserted, because they have to agree: the committed overlay
 * and the editable surface that replaces it while an edit is open. A `rect` —
 * whose defaults are the fallback values — is loaded alongside as the control
 * that nothing else moved.
 *
 * The two shapes are injected through the harness's doc hook rather than drawn,
 * since a toolbar-created shape gets its fields materialized by the factory,
 * which is exactly the path this is not about.
 */

const docText = JSON.stringify({
	version: 1,
	root: [
		{
			id: "bare-text",
			type: "text",
			x: 200,
			y: 160,
			text: "first line\na noticeably longer second line",
		},
		{
			id: "bare-rect",
			type: "rect",
			x: 200,
			y: 400,
			width: 240,
			height: 120,
			text: "boxed",
		},
	],
});

async function loadDoc(canvas: CanvasDriver) {
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
	await expect(canvas.objectById("bare-text")).toHaveCount(1);
	await expect(canvas.objectById("bare-rect")).toHaveCount(1);
}

/** Horizontal alignment the open editor's surface is laid out with. */
async function editorTextAlign(canvas: CanvasDriver): Promise<string | null> {
	return canvas.page.evaluate((editorSelector) => {
		const surface = document.querySelector(
			`${editorSelector} [contenteditable="true"]`,
		);
		return surface === null ? null : getComputedStyle(surface).textAlign;
	}, selectors.textEditor);
}

test.describe("text styles unset in the doc follow the object type's defaults", () => {
	test("draws a text object left / top, the type's own default", async ({
		canvas,
	}) => {
		await loadDoc(canvas);

		const style = await canvas.textStyleOf("bare-text");

		expect(style?.textAlign).toBe("left");
		// TextOverlayFrame maps verticalAlign "top" onto the wrapper's align-items.
		expect(style?.verticalAlign).toBe("flex-start");
	});

	test("lays the open editor out the same way, so entering an edit shifts nothing", async ({
		canvas,
	}) => {
		await loadDoc(canvas);

		// A point inside the first line's hit band; the doc coordinate is the drawn
		// top-left of the text.
		await canvas.typeTextAt({ x: 230, y: 170 }, "");

		expect(await editorTextAlign(canvas)).toBe("left");
		expect(await canvas.textEditorVerticalAlign()).toBe("top");

		await canvas.commitText();
	});

	test("shows the same alignment in the ObjectMenu", async ({ canvas }) => {
		await loadDoc(canvas);
		await canvas.selectAt({ x: 230, y: 170 });
		await canvas.openObjectMenu("alignment");

		// The active option is marked by ObjectMenuButton's isActive style
		// (border-color=accent, transparent otherwise), so "which one is active" is
		// read as "which one's border differs from the others".
		const borderColorOf = (value: string): Promise<string> =>
			canvas.page
				.locator(selectors.objectMenuSet("textAlign", value))
				.evaluate((el) => getComputedStyle(el).borderColor);

		const [left, center, right] = await Promise.all([
			borderColorOf("left"),
			borderColorOf("center"),
			borderColorOf("right"),
		]);

		expect(
			center,
			`the two inactive options look alike: center=${center} right=${right}`,
		).toBe(right);
		expect(
			left,
			`left is the active one: left=${left} center=${center}`,
		).not.toBe(center);
	});

	test("leaves a type whose defaults are the shared fallback drawn as before", async ({
		canvas,
	}) => {
		await loadDoc(canvas);

		const style = await canvas.textStyleOf("bare-rect");

		expect(style?.textAlign).toBe("center");
		expect(style?.verticalAlign).toBe("center");
	});
});
