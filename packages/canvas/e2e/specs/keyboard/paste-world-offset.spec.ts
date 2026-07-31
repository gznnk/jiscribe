import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * Guards that the paste offset (+20,+20) is in world coordinates and does not
 * depend on viewport panning.
 *
 * handlePaste applies PASTE_OFFSET in world coordinates. Were it based on screen
 * coordinates by mistake, a paste after panning would put the clone off by the
 * pan amount. Copy, pan, then paste, and check that the clone lands at the
 * source's world center +20,+20, which is the e,f of the matrix.
 */

/** Transform strings of every shape. */
async function transforms(canvas: CanvasDriver): Promise<(string | null)[]> {
	return (await canvas.captureObjects()).map((obj) => obj.transform);
}

test("places the paste at +20,+20 in world coordinates even after panning", async ({
	canvas,
}) => {
	// A rect centered at (500,260).
	await canvas.drawShape("Rectangle", { x: 400, y: 200 }, { x: 600, y: 320 });
	await canvas.copy();

	const viewBoxBefore = await canvas.getViewBox();

	await canvas.rightDrag({ x: 700, y: 700 }, { x: 480, y: 500 });
	await expect.poll(() => canvas.getViewBox()).not.toBe(viewBoxBefore);

	await canvas.paste();
	await expect.poll(async () => (await canvas.captureObjects()).length).toBe(2);

	// The original stays at world (500,260) and the clone lands at world
	// (520,280), independently of how far the viewport panned.
	const list = await transforms(canvas);
	expect(list).toContain("matrix(1, 0, 0, 1, 500, 260)");
	expect(list).toContain("matrix(1, 0, 0, 1, 520, 280)");
});
