// @vitest-environment jsdom

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { BorderColorIcon } from "../BorderColorIcon";
import { ColorPreviewIcon } from "../ColorPreviewIcon";
import { FontColorIcon } from "../FontColorIcon";

const RED = "#ff0000";
const GREEN = "#00ff00";
const BLUE = "#0000ff";
const WHITE = "#ffffff";

/** The icon parsed back into DOM, so its parts can be counted and their styles read. */
const renderIcon = (element: React.ReactElement): HTMLElement => {
	const container = document.createElement("div");
	container.innerHTML = renderToStaticMarkup(element);
	return container;
};

const fillsOf = (elements: NodeListOf<SVGElement>): string[] =>
	Array.from(elements, (element) => element.style.fill);

const strokesOf = (elements: NodeListOf<SVGElement>): string[] =>
	Array.from(elements, (element) => element.style.stroke);

const rgb = (hex: string): string => {
	const channels = [1, 3, 5].map((offset) =>
		Number.parseInt(hex.slice(offset, offset + 2), 16),
	);
	return `rgb(${channels.join(", ")})`;
};

describe("ColorPreviewIcon split between a selection's colors", () => {
	it.each([
		{ colors: [RED, GREEN], expected: [RED, GREEN] },
		{ colors: [RED, GREEN, BLUE], expected: [RED, GREEN, BLUE] },
		{ colors: [RED, GREEN, BLUE, WHITE], expected: [RED, GREEN, BLUE] },
	])(
		"draws one slice per color, up to three ($colors.length given)",
		({ colors, expected }) => {
			const icon = renderIcon(
				<ColorPreviewIcon color={RED} mixedColors={colors} />,
			);
			expect(fillsOf(icon.querySelectorAll("path"))).toEqual(expected.map(rgb));
			// The outline alone stays a circle, drawn over the slices unfilled.
			expect(icon.querySelector("circle")?.getAttribute("fill")).toBe("none");
		},
	);

	it("draws a transparent slice with a checker no other icon's fill can reach", () => {
		const markup = renderToStaticMarkup(
			<>
				<ColorPreviewIcon color={RED} mixedColors={["transparent", RED]} />
				<ColorPreviewIcon color="transparent" />
			</>,
		);
		const container = document.createElement("div");
		container.innerHTML = markup;
		const patternIds = Array.from(
			container.querySelectorAll("pattern"),
			(pattern) => pattern.id,
		);
		expect(new Set(patternIds).size).toBe(2);
		const firstSlice = container.querySelector("path");
		expect(firstSlice?.style.fill).toContain(patternIds[0]);
	});

	it("draws one filled circle when the selection agrees", () => {
		const icon = renderIcon(<ColorPreviewIcon color={RED} />);
		expect(icon.querySelectorAll("path")).toHaveLength(0);
		expect(icon.querySelector("circle")?.style.fill).toBe(rgb(RED));
	});
});

describe("BorderColorIcon split between a selection's colors", () => {
	it.each([
		{ colors: [RED, GREEN], expected: [RED, GREEN] },
		{ colors: [RED, GREEN, BLUE], expected: [RED, GREEN, BLUE] },
		{ colors: [RED, GREEN, BLUE, WHITE], expected: [RED, GREEN, BLUE] },
	])(
		"draws one arc per color, up to three ($colors.length given)",
		({ colors, expected }) => {
			const icon = renderIcon(
				<BorderColorIcon color={RED} mixedColors={colors} />,
			);
			expect(icon.querySelectorAll("circle")).toHaveLength(0);
			expect(strokesOf(icon.querySelectorAll("path"))).toEqual(
				expected.map(rgb),
			);
		},
	);
});

describe("FontColorIcon split between a selection's colors", () => {
	it.each([
		{ colors: [RED, GREEN], expected: [RED, GREEN] },
		{ colors: [RED, GREEN, BLUE], expected: [RED, GREEN, BLUE] },
		{ colors: [RED, GREEN, BLUE, WHITE], expected: [RED, GREEN, BLUE] },
	])(
		"draws one piece of the bar per color, up to three ($colors.length given)",
		({ colors, expected }) => {
			const icon = renderIcon(<FontColorIcon mixedColors={colors} />);
			expect(fillsOf(icon.querySelectorAll("rect"))).toEqual(expected.map(rgb));
		},
	);

	it("leaves a gap of 1 between the pieces and ends them flush with the bar", () => {
		const icon = renderIcon(<FontColorIcon mixedColors={[RED, GREEN]} />);
		const [left, right] = Array.from(icon.querySelectorAll("rect"), (rect) => ({
			x: Number(rect.getAttribute("x")),
			width: Number(rect.getAttribute("width")),
		}));
		expect(left.x).toBe(4);
		expect(right.x - (left.x + left.width)).toBeCloseTo(1);
		expect(right.x + right.width).toBeCloseTo(20);
	});
});
