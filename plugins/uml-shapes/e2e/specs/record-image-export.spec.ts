import { expect, test } from "@jiscribe/canvas-sdk/testing/e2e";
import type { CanvasDriver } from "@jiscribe/canvas-sdk/testing/e2e";
import type { Page } from "@playwright/test";

/**
 * The record's share of the image-export round trip (#167): a multi-slot shape has
 * to put every slot's text into the SVG export as a native <text>. The rest of the
 * round trip is core behavior and stays in the canvas suite
 * (specs/scenario/image-export-roundtrip).
 *
 * Coordinate note (shared with record.spec): created at 220x80, a title band
 * holding a one-line title is the top 28px (content y=[200,228]) and the row
 * compartment sits below it (y=[228,280]).
 */

/**
 * Export through the context menu and dialog as SVG with the data embedding turned
 * off, and return the downloaded file's contents as base64.
 */
const downloadSvgWithoutSource = async (
	page: Page,
	canvas: CanvasDriver,
	menuPoint: { x: number; y: number },
): Promise<string> => {
	await canvas.openContextMenu(menuPoint);
	await canvas.clickContextMenuCommand("export");
	await expect(page.getByTestId("export-dialog")).toBeVisible();

	await page.getByTestId("export-dialog:format-svg").check();
	await page.getByTestId("export-dialog:include-source").uncheck();

	const downloadPromise = page.waitForEvent("download");
	await page.getByTestId("export-dialog:submit").click();
	const download = await downloadPromise;
	const stream = await download.createReadStream();
	const chunks: Buffer[] = [];
	for await (const chunk of stream) {
		chunks.push(chunk as Buffer);
	}
	return Buffer.concat(chunks).toString("utf-8");
};

test("emits every slot of a record (multi-slot) shape as <text> in the SVG export", async ({
	canvas,
	page,
}) => {
	await canvas.drawShapeFromFlyout(
		"uml",
		"object",
		{ x: 300, y: 200 },
		{ x: 520, y: 280 },
	);
	await canvas.deselect();

	// The title band (within the top 28px) is the name slot; below it is the
	// attributes slot. The stencil drops the box in with sample text, so both are
	// filled in place of it rather than typed into.
	await canvas.replaceTextAt({ x: 410, y: 212 }, "Users");
	await canvas.commitText();
	await canvas.replaceTextAt({ x: 410, y: 255 }, "id: string\nname: string");
	await canvas.commitText();
	await canvas.deselect();

	// Data embedding is off, so a body match can only come from the rendered <text>.
	const svgText = await downloadSvgWithoutSource(page, canvas, {
		x: 750,
		y: 550,
	});

	expect(svgText).not.toContain("<foreignObject");
	const textElements = [...svgText.matchAll(/<text[\s\S]*?<\/text>/g)].join(
		" ",
	);
	expect(textElements).toContain("Users");
	expect(textElements).toContain("id: string");
	expect(textElements).toContain("name: string");
});
