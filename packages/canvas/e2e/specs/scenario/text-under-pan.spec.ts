import type { Page } from "@playwright/test";

import { test, expect } from "../../fixtures";

/**
 * Text must not creep inside its own shape while the viewport pans.
 *
 * Glyphs are rasterized on whole device pixels; a shape's outline is an SVG path
 * drawn wherever the geometry says. The two only hold still against each other
 * while the scene's sub-pixel phase does not move, so a pan by a fraction of a
 * pixel used to slide the text within its box by up to ~0.9px, sawtoothing once
 * per pixel of pan. The drawn camera is snapped to the device pixel grid to
 * freeze that phase (see snapViewportToDevicePixels).
 *
 * Only a raster can see this: the layout says the text sits a constant distance
 * below the shape's edge the whole time. So one screenshot per phase holds both
 * the shape's top border and the text, and each is reduced to an ink-weighted
 * row centroid — the gap between them is what must not move.
 */

/** Row centroids of the border band and of the text band, in one image. */
const measureRows = async (
	page: Page,
	shot: Buffer,
	borderRows: number,
	textFromRow: number,
) =>
	page.evaluate(
		async ([base64, borderEnd, textStart]) => {
			const res = await fetch(`data:image/png;base64,${base64}`);
			const bitmap = await createImageBitmap(await res.blob());
			const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
			const ctx = canvas.getContext("2d");
			if (!ctx) {
				throw new Error("no 2d context");
			}
			ctx.drawImage(bitmap, 0, 0);
			const image = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
			const rowCentroid = (fromRow: number, toRow: number) => {
				let sum = 0;
				let weight = 0;
				for (let y = fromRow; y < toRow; y++) {
					for (let x = 0; x < image.width; x++) {
						const i = (y * image.width + x) * 4;
						// Light ink on the dark shape fill; the floor drops the fill.
						const ink = Math.max(
							0,
							(image.data[i] + image.data[i + 1] + image.data[i + 2]) / 3 - 45,
						);
						sum += y * ink;
						weight += ink;
					}
				}
				if (weight === 0) {
					throw new Error("no ink in the measured band");
				}
				return sum / weight;
			};
			return {
				border: rowCentroid(0, Number(borderEnd)),
				text: rowCentroid(Number(textStart), image.height),
			};
		},
		[shot.toString("base64"), String(borderRows), String(textFromRow)] as const,
	);

/** Screen box of the shape and of its glyphs, from layout. */
const readGeometry = (page: Page) =>
	page.evaluate(() => {
		const content = Array.from(document.querySelectorAll("foreignObject"))
			.map(
				(fo) => fo.firstElementChild?.firstElementChild as HTMLElement | null,
			)
			.find((el) => el && el.textContent?.trim() === "Hello Canvas");
		const shape = document.querySelector(
			'[data-kind="object"]',
		) as SVGGraphicsElement | null;
		if (!content || !shape) {
			throw new Error("missing text overlay or shape");
		}
		const shapeRect = shape.getBoundingClientRect();
		const range = document.createRange();
		range.selectNodeContents(content);
		const glyph = range.getBoundingClientRect();
		return {
			shapeLeft: shapeRect.left,
			shapeTop: shapeRect.top,
			glyphTop: glyph.top,
			glyphBottom: glyph.bottom,
		};
	});

/** Wheel deltas below one pixel, the shape a trackpad or a smooth wheel sends. */
const SUB_PIXEL_PAN = 0.125;
/** Enough steps to cross a whole pixel, so every sub-pixel phase is visited. */
const PAN_STEPS = 8;

test("text holds its place inside the shape while the viewport pans", async ({
	canvas,
}) => {
	await canvas.drawShape("Rectangle", { x: 400, y: 200 }, { x: 640, y: 320 });
	await canvas.deselect();
	await canvas.typeTextAt({ x: 520, y: 260 }, "Hello Canvas");
	await canvas.commitText();

	const gaps: number[] = [];
	for (let step = 0; step <= PAN_STEPS; step++) {
		const geometry = await readGeometry(canvas.page);
		// Re-anchored every phase so both features stay in frame. The gap is a
		// difference within one image, so the clip's own rounding cancels out.
		const clipTop = Math.round(geometry.shapeTop) - 3;
		const clip = {
			x: Math.round(geometry.shapeLeft) + 40,
			y: clipTop,
			width: 160,
			height: Math.round(geometry.glyphBottom) + 4 - clipTop,
		};
		const rows = await measureRows(
			canvas.page,
			await canvas.page.screenshot({ clip }),
			8,
			Math.round(geometry.glyphTop) - 2 - clipTop,
		);
		gaps.push(rows.text - rows.border);

		await canvas.page.mouse.move(300, 700);
		await canvas.page.mouse.wheel(0, SUB_PIXEL_PAN);
		await canvas.page.waitForTimeout(60);
	}

	// Half a device pixel of swing is what the unsnapped camera produced; a tenth
	// leaves room for antialiasing noise while still failing that.
	const swing = Math.max(...gaps) - Math.min(...gaps);
	expect(swing, `text-to-border gaps: ${gaps.join(", ")}`).toBeLessThan(0.1);

	// The pan must still land: sub-pixel deltas accumulate rather than each being
	// rounded away, so crossing a whole pixel actually moves the scene.
	const moved = await readGeometry(canvas.page);
	expect(moved.shapeTop).toBeLessThan(240);
});
