import { test, expect } from "../../fixtures";

/**
 * Ctrl+wheel zoom applies exactly one fixed-factor step per event, decided by
 * the sign of the delta alone and independent of its magnitude.
 *
 * zoom-cursor-anchor.spec guards the anchoring and zoom-keyboard-factor.spec the
 * geometric progression on the keyboard path, but the factor on the wheel path
 * was unchecked. The wheel→zoom conversion in handleGesture maps the event to
 *   zoomScale = (wheel deltaY) > 0 ? ZOOM.OUT_FACTOR : ZOOM.IN_FACTOR
 * so it looks only at the sign of deltaY and applies x1.1 / x0.9 once per event;
 * the magnitude of deltaY does not affect the factor. Making it proportional to
 * the magnitude, or turning it into several steps, fails here.
 *
 * viewBox width = viewport.width / round(zoom,4), so the ratio of widths is the
 * factor itself to ~1e-4. The factor does not depend on the anchor, so a fixed
 * zoom position is enough.
 */

type ViewBox = { minX: number; minY: number; width: number; height: number };

function parseViewBox(raw: string | null): ViewBox {
	if (!raw) {
		throw new Error("cannot read the viewBox");
	}
	const [minX, minY, width, height] = raw.trim().split(/\s+/).map(Number);
	return { minX, minY, width, height };
}

/** Kept in sync with ZOOM.IN_FACTOR (constants/zoom.ts) */
const IN_FACTOR = 1.1;
/** Kept in sync with ZOOM.OUT_FACTOR (constants/zoom.ts) */
const OUT_FACTOR = 0.9;
/** Zoom anchor; a fixed point is enough because the factor does not depend on it */
const ANCHOR = { x: 500, y: 400 };

async function viewBoxWidth(canvas: {
	getViewBox: () => Promise<string | null>;
}): Promise<number> {
	return parseViewBox(await canvas.getViewBox()).width;
}

test.describe("wheel zoom single-step factor", () => {
	test("applies x1.1 / x0.9 once from the sign of deltaY alone, independent of its magnitude", async ({
		canvas,
	}) => {
		const w0 = await viewBoxWidth(canvas);

		// Zoom in with a large deltaY: the viewBox width becomes 1/1.1 of what it was.
		await canvas.wheel(ANCHOR, { deltaY: -200, ctrl: true });
		await expect.poll(() => viewBoxWidth(canvas)).toBeLessThan(w0);
		const w1 = await viewBoxWidth(canvas);
		expect(w0 / w1).toBeCloseTo(IN_FACTOR, 3);

		// Zoom in with a small deltaY: the same factor, independent of the magnitude.
		await canvas.wheel(ANCHOR, { deltaY: -40, ctrl: true });
		await expect.poll(() => viewBoxWidth(canvas)).toBeLessThan(w1);
		const w2 = await viewBoxWidth(canvas);
		expect(w1 / w2).toBeCloseTo(IN_FACTOR, 3);

		// Zoom out with a large deltaY: the viewBox width becomes 1/0.9 of what it was.
		await canvas.wheel(ANCHOR, { deltaY: 200, ctrl: true });
		await expect.poll(() => viewBoxWidth(canvas)).toBeGreaterThan(w2);
		const w3 = await viewBoxWidth(canvas);
		expect(w3 / w2).toBeCloseTo(1 / OUT_FACTOR, 3);

		// Zoom out with a small deltaY: the same factor, independent of the magnitude.
		await canvas.wheel(ANCHOR, { deltaY: 25, ctrl: true });
		await expect.poll(() => viewBoxWidth(canvas)).toBeGreaterThan(w3);
		const w4 = await viewBoxWidth(canvas);
		expect(w4 / w3).toBeCloseTo(1 / OUT_FACTOR, 3);
	});
});
