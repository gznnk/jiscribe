import { test, expect } from "../../fixtures";

/**
 * Where duplicate / paste places the new shape.
 *
 * The existing clipboard.spec only looks at how the object count changes, so it
 * cannot catch a regression that drops the duplicate or paste right on top of
 * the original, where the user cannot tell anything was added. This guards the
 * default offset (+20,+20) and duplicate's move-aware offset (Figma style:
 * moving the previous duplicate makes that displacement the offset for the next
 * one).
 *
 * Position is read from transform="matrix(1, 0, 0, 1, e, f)", where e,f is the
 * center.
 */

/** Center transform strings of every shape currently present. */
async function transforms(canvas: {
	captureObjects: () => Promise<{ transform: string | null }[]>;
}): Promise<(string | null)[]> {
	return (await canvas.captureObjects()).map((o) => o.transform);
}

test.describe("duplicate / paste placement", () => {
	test("places the duplicate at +20,+20 and leaves the original alone", async ({
		canvas,
	}) => {
		// A rect centered at (500,260).
		await canvas.drawShape("Rectangle", { x: 400, y: 200 }, { x: 600, y: 320 });

		await canvas.duplicate();

		await expect
			.poll(async () => (await canvas.captureObjects()).length)
			.toBe(2);

		const list = await transforms(canvas);
		expect(list).toContain("matrix(1, 0, 0, 1, 500, 260)");
		expect(list).toContain("matrix(1, 0, 0, 1, 520, 280)");
	});

	test("places the pasted shape at +20,+20", async ({ canvas }) => {
		await canvas.drawShape("Rectangle", { x: 400, y: 200 }, { x: 600, y: 320 });

		await canvas.copy();
		await canvas.paste();

		await expect
			.poll(async () => (await canvas.captureObjects()).length)
			.toBe(2);

		const list = await transforms(canvas);
		expect(list).toContain("matrix(1, 0, 0, 1, 500, 260)");
		expect(list).toContain("matrix(1, 0, 0, 1, 520, 280)");
	});

	test("move-aware duplicate offset: moving a duplicate makes the next one follow by the same displacement", async ({
		canvas,
	}) => {
		// A rect centered at (500,260).
		await canvas.drawShape("Rectangle", { x: 400, y: 200 }, { x: 600, y: 320 });

		// The first duplicate lands at (520,280) and becomes the selection.
		await canvas.duplicate();
		await expect
			.poll(() => transforms(canvas))
			.toContain("matrix(1, 0, 0, 1, 520, 280)");

		// Move that duplicate from (520,280) to (620,280), i.e. by (+100,0).
		await canvas.drag({ x: 520, y: 280 }, { x: 620, y: 280 });
		await expect
			.poll(() => transforms(canvas))
			.toContain("matrix(1, 0, 0, 1, 620, 280)");

		// The second duplicate takes the previous displacement (+100,0) as its
		// offset and lands at (720,280).
		await canvas.duplicate();

		await expect
			.poll(async () => (await canvas.captureObjects()).length)
			.toBe(3);
		const list = await transforms(canvas);
		expect(list).toContain("matrix(1, 0, 0, 1, 500, 260)"); // original
		expect(list).toContain("matrix(1, 0, 0, 1, 620, 280)"); // moved first duplicate
		expect(list).toContain("matrix(1, 0, 0, 1, 720, 280)"); // move-aware second duplicate
	});
});
