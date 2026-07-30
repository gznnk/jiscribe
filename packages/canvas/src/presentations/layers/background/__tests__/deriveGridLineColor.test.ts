import { describe, expect, it } from "vitest";

import { deriveGridLineColor } from "../deriveGridLineColor";

// Channel-average luminance of a #rrggbb string (0..255), for asserting the
// derived line moved toward the expected pole without pinning an exact color.
const avg = (hex: string): number => {
	const r = parseInt(hex.slice(1, 3), 16);
	const g = parseInt(hex.slice(3, 5), 16);
	const b = parseInt(hex.slice(5, 7), 16);
	return (r + g + b) / 3;
};

describe("deriveGridLineColor", () => {
	it("darkens the line on a light background (steps toward black)", () => {
		const line = deriveGridLineColor("#ffffff");
		expect(line).not.toBeNull();
		expect(avg(line as string)).toBeLessThan(255);
	});

	it("lightens the line on a dark background (steps toward white)", () => {
		const line = deriveGridLineColor("#1e1e1e");
		expect(line).not.toBeNull();
		// #1e = 30; lightened toward white so each channel exceeds the background.
		expect(avg(line as string)).toBeGreaterThan(30);
	});

	it("keeps the line in the background's hue family (tonal, not gray)", () => {
		// A saturated navy stays blue-dominant after the mix toward white.
		const line = deriveGridLineColor("#10204a") as string;
		const r = parseInt(line.slice(1, 3), 16);
		const b = parseInt(line.slice(5, 7), 16);
		expect(b).toBeGreaterThan(r);
	});

	it("reads #rgb shorthand and rgb()/rgba() forms", () => {
		expect(deriveGridLineColor("#fff")).not.toBeNull();
		expect(deriveGridLineColor("rgb(255, 255, 255)")).not.toBeNull();
		expect(deriveGridLineColor("rgba(30 30 30 / 0.5)")).not.toBeNull();
	});

	it("returns null for unparseable colors so the caller falls back to the token", () => {
		expect(deriveGridLineColor("auto")).toBeNull();
		expect(deriveGridLineColor("rebeccapurple")).toBeNull();
		expect(deriveGridLineColor("var(--jiscribe-canvasBg, #fff)")).toBeNull();
		expect(deriveGridLineColor("hsl(210, 50%, 20%)")).toBeNull();
		expect(deriveGridLineColor("#ff")).toBeNull();
	});
});
