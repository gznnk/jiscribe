import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * e2e for revealing the text-edit caret: the camera pans so the caret being
 * typed at stays on screen, and stays put while it already is. The browser's own
 * focus scrolling is suppressed (focus({ preventScroll: true })), so any
 * movement seen here is the canvas camera, not a scrolled ancestor.
 */

/** Lines typed to push a text object's box past the bottom edge of the canvas. */
const GROWTH_LINE_COUNT = 20;

/** Words typed to push a text object's single line past the right edge of the canvas. */
const GROWTH_WORD_COUNT = 40;

/** Zoom steps allowed while growing a shape past the canvas area (1.25x each). */
const ZOOM_STEP_LIMIT = 8;

/** Screen box of the canvas area itself. */
async function canvasArea(canvas: CanvasDriver) {
	const box = await canvas.page.locator('[data-kind="canvas"]').boundingBox();
	if (!box) {
		throw new Error("the canvas area has no box on screen");
	}
	return box;
}

/** Whether the object covers the whole canvas area, so the view sits inside it. */
async function coversCanvasArea(
	canvas: CanvasDriver,
	id: string,
): Promise<boolean> {
	const objectBox = await canvas.objectById(id).boundingBox();
	if (!objectBox) {
		throw new Error(`object ${id} has no box on screen`);
	}
	const area = await canvasArea(canvas);
	return (
		objectBox.x <= area.x &&
		objectBox.y <= area.y &&
		objectBox.x + objectBox.width >= area.x + area.width &&
		objectBox.y + objectBox.height >= area.y + area.height
	);
}

/** Center of an object's drawn box, in content coordinates. */
async function centerOf(
	canvas: CanvasDriver,
	id: string,
): Promise<{ x: number; y: number }> {
	const box = await canvas.objectById(id).boundingBox();
	if (!box) {
		throw new Error(`object ${id} has no box on screen`);
	}
	return canvas.toContent({
		x: box.x + box.width / 2,
		y: box.y + box.height / 2,
	});
}

/** The viewBox's minX, which is what a horizontal pan moves. */
async function viewBoxMinX(canvas: CanvasDriver): Promise<number> {
	const viewBox = await canvas.getViewBox();
	if (!viewBox) {
		throw new Error("the canvas svg carries no viewBox");
	}
	return Number(viewBox.trim().split(/\s+/)[0]);
}

/** The viewBox's minY, which is what a vertical pan moves. */
async function viewBoxMinY(canvas: CanvasDriver): Promise<number> {
	const viewBox = await canvas.getViewBox();
	if (!viewBox) {
		throw new Error("the canvas svg carries no viewBox");
	}
	return Number(viewBox.trim().split(/\s+/)[1]);
}

/** Right edge of an element and of the canvas area, both in screen px. */
async function rightEdges(canvas: CanvasDriver, id: string) {
	const objectBox = await canvas.objectById(id).boundingBox();
	const canvasBox = await canvasArea(canvas);
	if (!objectBox) {
		throw new Error("cannot measure the object against the canvas area");
	}
	return {
		object: objectBox.x + objectBox.width,
		canvas: canvasBox.x + canvasBox.width,
	};
}

/** Bottom edge of an element and of the canvas area, both in screen px. */
async function bottomEdges(canvas: CanvasDriver, id: string) {
	const objectBox = await canvas.objectById(id).boundingBox();
	const canvasBox = await canvas.page
		.locator('[data-kind="canvas"]')
		.boundingBox();
	if (!objectBox || !canvasBox) {
		throw new Error("cannot measure the object against the canvas area");
	}
	return {
		object: objectBox.y + objectBox.height,
		canvas: canvasBox.y + canvasBox.height,
	};
}

test.describe("text edit reveal", () => {
	test("leaves the camera alone while the edited box stays on screen", async ({
		canvas,
	}) => {
		const id = await canvas.placeShape("Text");
		await canvas.deselect();

		const before = await canvas.getViewBox();
		const placedWidth = (await canvas.objectById(id).boundingBox())?.width ?? 0;

		// The editor opens with the caret at the end, so this extends "Text".
		await canvas.typeTextAt(await centerOf(canvas, id), " stays inside");
		await expect
			.poll(async () => (await canvas.objectById(id).boundingBox())?.width, {
				message: "the box widens while the edit is still open",
			})
			.toBeGreaterThan(placedWidth);

		expect(await canvas.getViewBox()).toBe(before);

		await canvas.commitText();
		expect(await canvas.getViewBox()).toBe(before);
	});

	test("pans down as the edited text grows past the bottom edge", async ({
		canvas,
	}) => {
		const id = await canvas.placeShape("Text");
		await canvas.deselect();

		const beforeMinY = await viewBoxMinY(canvas);
		const beforeEdges = await bottomEdges(canvas, id);
		expect(beforeEdges.object).toBeLessThan(beforeEdges.canvas);

		// A text object grows down from the corner the doc stores, so enough lines
		// push its bottom past the canvas area.
		await canvas.typeTextAt(
			await centerOf(canvas, id),
			"\nline".repeat(GROWTH_LINE_COUNT),
		);

		await expect
			.poll(() => viewBoxMinY(canvas), {
				message: "the camera follows the growing box downward",
			})
			.toBeGreaterThan(beforeMinY);

		// Following it means it is on screen again, not merely that something moved.
		const afterEdges = await bottomEdges(canvas, id);
		expect(afterEdges.object).toBeLessThanOrEqual(afterEdges.canvas);
	});

	test("keeps following the caret typed at the end of a line wider than the canvas", async ({
		canvas,
	}) => {
		const id = await canvas.placeShape("Text");
		await canvas.deselect();

		// One line with no newline in it: the box grows only sideways, so it ends up
		// wider than the visible area and can hold the whole of it.
		await canvas.typeTextAt(
			await centerOf(canvas, id),
			" wide".repeat(GROWTH_WORD_COUNT),
		);
		const area = await canvasArea(canvas);
		const grownWidth = (await canvas.objectById(id).boundingBox())?.width ?? 0;
		expect(grownWidth).toBeGreaterThan(area.width);

		// Following the box would have stopped here, the visible area now sitting
		// inside it; following the caret keeps panning with what is being typed.
		const beforeMinX = await viewBoxMinX(canvas);
		await canvas.page.keyboard.type(" and more");

		await expect
			.poll(() => viewBoxMinX(canvas), {
				message: "the camera follows the caret rightward",
			})
			.toBeGreaterThan(beforeMinX);

		// The caret sits at the end of the line, so the box's right edge trails it
		// onto the screen.
		const afterEdges = await rightEdges(canvas, id);
		expect(afterEdges.object).toBeLessThanOrEqual(afterEdges.canvas);
	});

	test("pans back when the caret jumps to the start of such a line", async ({
		canvas,
	}) => {
		const id = await canvas.placeShape("Text");
		await canvas.deselect();

		await canvas.typeTextAt(
			await centerOf(canvas, id),
			" wide".repeat(GROWTH_WORD_COUNT),
		);
		const beforeMinX = await viewBoxMinX(canvas);

		// Home moves the caret without changing the text, so nothing but the caret
		// report itself can bring the start of the line back on screen.
		await canvas.page.keyboard.press("Home");

		await expect
			.poll(() => viewBoxMinX(canvas), {
				message: "the camera follows the caret back to the line start",
			})
			.toBeLessThan(beforeMinX);

		const objectBox = await canvas.objectById(id).boundingBox();
		const area = await canvasArea(canvas);
		expect(objectBox?.x ?? 0).toBeGreaterThanOrEqual(area.x);
	});

	test("leaves the camera alone when editing a shape larger than the viewport", async ({
		canvas,
	}) => {
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 100, y: 80 },
			{ x: 1000, y: 700 },
		);

		// Keyboard zoom is anchored at the viewport center, which the rect straddles,
		// so zooming in walks the visible area inside the rect rather than off it.
		for (let step = 0; step < ZOOM_STEP_LIMIT; step += 1) {
			if (await coversCanvasArea(canvas, id)) {
				break;
			}
			await canvas.zoomIn();
		}
		expect(await coversCanvasArea(canvas, id)).toBe(true);

		const area = await canvasArea(canvas);
		const center = canvas.toContent({
			x: area.x + area.width / 2,
			y: area.y + area.height / 2,
		});

		const before = await canvas.getViewBox();
		await canvas.typeTextAt(center, "label");
		await expect
			.poll(() => canvas.textArea().inputValue(), {
				message: "the typed label reaches the editor",
			})
			.toBe("label");

		expect(await canvas.getViewBox()).toBe(before);

		await canvas.cancelText();
	});
});
