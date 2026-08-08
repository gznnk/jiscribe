import { test, expect } from "../../fixtures";

/**
 * Pins the drawing geometry of the Ellipse.
 *
 * The implementation (Ellipse.tsx) draws around the local origin: cx=0, cy=0,
 * rx=width/2, ry=height/2, and carries the center in the transform's (e,f).
 * The drawn rect must determine rx/ry and the center exactly. Swapping rx and ry
 * or misplacing the center (writing it into cx/cy, say) survives a check on the
 * element tag alone.
 *
 * zoom=1, so drawing coordinates are world coordinates. (400,200)-(600,320) is
 * 200 x 120 centered at (500,260).
 */
test.describe("ellipse drawing geometry", () => {
	test("derives rx=width/2, ry=height/2 and center=transform(e,f) exactly from the drawn rect", async ({
		canvas,
	}) => {
		const id = await canvas.drawShape(
			"Ellipse",
			{ x: 400, y: 200 },
			{ x: 600, y: 320 },
		);
		const ellipse = canvas.objectById(id);

		// Drawn around the local origin, so the ellipse element's own cx/cy are 0.
		expect(await ellipse.getAttribute("cx")).toBe("0");
		expect(await ellipse.getAttribute("cy")).toBe("0");
		// rx = width/2 = 100, ry = height/2 = 60.
		expect(await ellipse.getAttribute("rx")).toBe("100");
		expect(await ellipse.getAttribute("ry")).toBe("60");
		// The center rides in the transform's (e,f) = (500,260), with no rotation or flip.
		expect(await ellipse.getAttribute("transform")).toBe(
			"matrix(1, 0, 0, 1, 500, 260)",
		);
	});

	test("gives rx<ry for a tall drawn rect, catching an rx/ry swap", async ({
		canvas,
	}) => {
		// Tall 120 x 200 rect, so rx=60 < ry=100.
		const id = await canvas.drawShape(
			"Ellipse",
			{ x: 440, y: 160 },
			{ x: 560, y: 360 },
		);
		const ellipse = canvas.objectById(id);

		expect(await ellipse.getAttribute("rx")).toBe("60");
		expect(await ellipse.getAttribute("ry")).toBe("100");
		// Center (500,260).
		expect(await ellipse.getAttribute("transform")).toBe(
			"matrix(1, 0, 0, 1, 500, 260)",
		);
	});
});
