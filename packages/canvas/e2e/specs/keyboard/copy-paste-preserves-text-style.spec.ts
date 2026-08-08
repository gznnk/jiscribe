import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * Guards that copy-paste and duplicate carry over the text style: font size,
 * font color and bold.
 *
 * The existing preserves-content specs look at background color and text
 * content, but whether the TextStyle font properties (fontSize / fontColor /
 * fontWeight) survive clipboard serialization was uncovered. The clone is
 * checked through its rendered computed style.
 */

const FONT_SIZE = 40;
const FONT_COLOR = "#e11d48";

/**
 * Draws a rect with text and sets font size, font color and bold, then returns
 * the id. Leaves the shape selected.
 */
async function drawStyledRect(canvas: CanvasDriver): Promise<string> {
	const id = await canvas.drawShape(
		"Rectangle",
		{ x: 360, y: 180 },
		{ x: 600, y: 340 },
	);
	await canvas.typeTextAt({ x: 480, y: 260 }, "Styled");
	await canvas.commitText();
	await canvas.selectAt({ x: 480, y: 260 });

	await canvas.openObjectMenu("font-size");
	await canvas.setNumberInput("fontSize", FONT_SIZE);
	await canvas.setColor("font-color", FONT_COLOR);
	await canvas.setTextFormat("fontWeight", "bold");

	// Wait until the settings have reached the rendering.
	await expect
		.poll(async () => (await canvas.textStyleOf(id))?.fontWeight)
		.toBe("700");
	return id;
}

/** Returns the data-id of the shape that was just added (the copy or clone). */
async function newObjectId(
	canvas: CanvasDriver,
	beforeIds: Set<string | null>,
): Promise<string> {
	const after = await canvas.captureObjects();
	const created = after.find((obj) => !beforeIds.has(obj.id));
	if (!created?.id) {
		throw new Error("no data-id on the newly added shape");
	}
	return created.id;
}

test.describe("copy-paste / duplicate preserve text style", () => {
	test("carries fontSize / fontColor / fontWeight over on copy-paste", async ({
		canvas,
	}) => {
		const srcId = await drawStyledRect(canvas);
		const expectedColor = await canvas.normalizeColor(FONT_COLOR);

		const before = await canvas.captureObjects();
		const beforeIds = new Set(before.map((obj) => obj.id));

		await canvas.copy();
		await canvas.paste();
		await expect
			.poll(async () => (await canvas.captureObjects()).length)
			.toBe(before.length + 1);

		const pastedId = await newObjectId(canvas, beforeIds);
		const pastedStyle = await canvas.textStyleOf(pastedId);
		expect(pastedStyle?.fontSize).toBe(`${FONT_SIZE}px`);
		expect(pastedStyle?.color).toBe(expectedColor);
		expect(pastedStyle?.fontWeight).toBe("700");

		const srcStyle = await canvas.textStyleOf(srcId);
		expect(srcStyle?.fontSize).toBe(`${FONT_SIZE}px`);
		expect(srcStyle?.fontWeight).toBe("700");
	});

	test("carries fontSize / fontColor / fontWeight over on duplicate (Ctrl+D)", async ({
		canvas,
	}) => {
		await drawStyledRect(canvas);
		const expectedColor = await canvas.normalizeColor(FONT_COLOR);

		const before = await canvas.captureObjects();
		const beforeIds = new Set(before.map((obj) => obj.id));

		await canvas.duplicate();
		await expect
			.poll(async () => (await canvas.captureObjects()).length)
			.toBe(before.length + 1);

		const clonedId = await newObjectId(canvas, beforeIds);
		const clonedStyle = await canvas.textStyleOf(clonedId);
		expect(clonedStyle?.fontSize).toBe(`${FONT_SIZE}px`);
		expect(clonedStyle?.color).toBe(expectedColor);
		expect(clonedStyle?.fontWeight).toBe("700");
	});
});
