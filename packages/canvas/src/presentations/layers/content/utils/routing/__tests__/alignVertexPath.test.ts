import type { Point } from "@workspace/geometry";
import { describe, expect, it } from "vitest";

import { alignVertexPath } from "../alignVertexPath";

// The vertices left by dragging the middle segment of a right-face → left-face route to x = 350.
const vertices: Point[] = [
	{ x: 350, y: 90 },
	{ x: 350, y: 270 },
];

describe("alignVertexPath", () => {
	it("leaves the vertices alone while the endpoints are where they were", () => {
		expect(
			alignVertexPath(
				vertices,
				{ x: 160, y: 90 },
				{ x: 420, y: 270 },
				"right",
				"left",
			),
		).toEqual(vertices);
	});

	it("takes the first vertex down with the source, keeping the segment horizontal", () => {
		expect(
			alignVertexPath(
				vertices,
				{ x: 160, y: 290 },
				{ x: 420, y: 270 },
				"right",
				"left",
			),
		).toEqual([
			{ x: 350, y: 290 },
			{ x: 350, y: 270 },
		]);
	});

	it("takes the last vertex with the target", () => {
		expect(
			alignVertexPath(
				vertices,
				{ x: 160, y: 90 },
				{ x: 470, y: 380 },
				"right",
				"left",
			),
		).toEqual([
			{ x: 350, y: 90 },
			{ x: 350, y: 380 },
		]);
	});

	it("moves the other coordinate when the line leaves through a top or bottom face", () => {
		expect(
			alignVertexPath(
				[
					{ x: 300, y: 200 },
					{ x: 500, y: 200 },
				],
				{ x: 260, y: 120 },
				{ x: 540, y: 320 },
				"down",
				"up",
			),
		).toEqual([
			{ x: 260, y: 200 },
			{ x: 540, y: 200 },
		]);
	});

	it("applies both ends to a single vertex, each on its own coordinate", () => {
		// An L route: the source leaves sideways and the target from below, so the corner shares its
		// y with the source and its x with the target — the nearer of its two possible positions.
		expect(
			alignVertexPath(
				[{ x: 470, y: 90 }],
				{ x: 160, y: 130 },
				{ x: 500, y: 240 },
				"right",
				"up",
			),
		).toEqual([{ x: 500, y: 130 }]);
	});

	it("keeps a corner whose arriving segment runs along the target's face line", () => {
		// A run dragged onto the target's face leaves this corner: the line reaches the target's x
		// and drops along the face. Both exits are horizontal, so deriving axes from them would slam
		// the corner onto the target and draw a single diagonal from source to target.
		expect(
			alignVertexPath(
				[{ x: 820, y: 230 }],
				{ x: 460, y: 230 },
				{ x: 820, y: 490 },
				"right",
				"left",
			),
		).toEqual([{ x: 820, y: 230 }]);
	});

	it("keeps that corner following the source after it moves", () => {
		expect(
			alignVertexPath(
				[{ x: 820, y: 230 }],
				{ x: 460, y: 300 },
				{ x: 820, y: 490 },
				"right",
				"left",
			),
		).toEqual([{ x: 820, y: 300 }]);
	});

	it("breaks a dead tie between the two corner positions by the exit directions", () => {
		// The vertex sits exactly between its two right-angled positions (50,50) and (-50,-50); the
		// horizontal source exit decides.
		expect(
			alignVertexPath(
				[{ x: 0, y: 0 }],
				{ x: -50, y: 50 },
				{ x: 50, y: -50 },
				"right",
				"up",
			),
		).toEqual([{ x: 50, y: 50 }]);
	});

	it("keeps the path axis-aligned when the endpoint's exit flips axis", () => {
		// The source used to leave sideways, so the first stored segment is vertical. Re-anchored to
		// the top face it now leaves upward — taking the axis from the exit direction would move the
		// vertex's x and leave the segment it shares with its neighbour diagonal.
		expect(
			alignVertexPath(
				vertices,
				{ x: 300, y: 40 },
				{ x: 420, y: 270 },
				"up",
				"left",
			),
		).toEqual([
			{ x: 350, y: 40 },
			{ x: 350, y: 270 },
		]);
	});

	it("takes the axis from the neighbour at the target end too", () => {
		expect(
			alignVertexPath(
				vertices,
				{ x: 160, y: 90 },
				{ x: 500, y: 600 },
				"right",
				"down",
			),
		).toEqual([
			{ x: 350, y: 90 },
			{ x: 350, y: 600 },
		]);
	});

	it("leaves a route folded back on itself folded", () => {
		// The source has moved to the right of the vertical run: the path doubles back and is drawn
		// that way rather than being reshaped.
		expect(
			alignVertexPath(
				vertices,
				{ x: 600, y: 90 },
				{ x: 420, y: 270 },
				"right",
				"left",
			),
		).toEqual(vertices);
	});
});
