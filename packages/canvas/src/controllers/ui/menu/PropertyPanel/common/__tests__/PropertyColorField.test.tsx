// @vitest-environment jsdom

import { AUTO_COLOR } from "@jiscribe/doc/model/objects/utils/autoColor";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { theme } from "../../../../../../foundation/theme/themeTokens";
import { PropertyColorField } from "../PropertyColorField";
import type * as PropertyControlsStyledModule from "../PropertyControlsStyled";

// Without this React treats every `act` below as unsupported and warns, the
// flushes being correct all the same.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

// jsdom does not cascade emotion's class rules, so the swatches hand the color
// they were given to an attribute instead.
vi.mock("../PropertyControlsStyled", async (importOriginal) => {
	const actual = await importOriginal<typeof PropertyControlsStyledModule>();
	return {
		...actual,
		PropertyColorSwatch: ({ swatchColor }: { swatchColor: string }) => (
			<span data-swatch-color={swatchColor} />
		),
		PropertyColorMixedSwatchSegment: ({
			swatchColor,
		}: {
			swatchColor: string;
		}) => <span data-swatch-color={swatchColor} />,
	};
});

const AUTO_SWATCH_COLOR = "rgb(11, 18, 32)";
const STATED_COLOR = "#dc2626";

let container: HTMLDivElement | null = null;
let root: ReturnType<typeof createRoot> | null = null;

/** Mounts the field and returns the colors its swatch is drawn in, segment by segment. */
const renderSwatchColors = (props: {
	value: string;
	mixedValues?: readonly string[];
	autoSwatchColor?: string;
}): (string | null)[] => {
	container = document.createElement("div");
	root = createRoot(container);
	const mounted = root;
	act(() => {
		mounted.render(
			<PropertyColorField
				{...props}
				property="label.fill"
				role="canvas"
				title="Label Background Color"
				onStyleIntent={() => {}}
			/>,
		);
	});
	return [...container.querySelectorAll("[data-swatch-color]")].map((swatch) =>
		swatch.getAttribute("data-swatch-color"),
	);
};

afterEach(() => {
	const mounted = root;
	act(() => mounted?.unmount());
	root = null;
	container = null;
});

describe("PropertyColorField autoSwatchColor", () => {
	it("shows it for an auto value in place of the role's token", () => {
		expect(
			renderSwatchColors({
				value: AUTO_COLOR,
				autoSwatchColor: AUTO_SWATCH_COLOR,
			}),
		).toEqual([AUTO_SWATCH_COLOR]);
	});

	it("leaves an auto value to the role when omitted", () => {
		expect(renderSwatchColors({ value: AUTO_COLOR })).toEqual([theme.canvasBg]);
	});

	it("leaves a stated color as it is", () => {
		expect(
			renderSwatchColors({
				value: STATED_COLOR,
				autoSwatchColor: AUTO_SWATCH_COLOR,
			}),
		).toEqual([STATED_COLOR]);
	});

	it("shows it for the auto segment of a mixed swatch, leaving the stated one", () => {
		expect(
			renderSwatchColors({
				value: AUTO_COLOR,
				mixedValues: [AUTO_COLOR, STATED_COLOR],
				autoSwatchColor: AUTO_SWATCH_COLOR,
			}),
		).toEqual([AUTO_SWATCH_COLOR, STATED_COLOR]);
	});
});
