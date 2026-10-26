// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import { ColorSwatch } from "../../ObjectMenu/common/ObjectMenuColorPickerGrid/ObjectMenuColorPickerGridStyled";
import {
	PropertyColorMixedSwatchSegment,
	PropertyColorSwatch,
} from "../../PropertyPanel/common/PropertyControlsStyled";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const CHECKER = "repeating-conic-gradient";

/** The CSS emotion inserted for the element's class, read back from the head. */
const backgroundRuleOf = (element: React.ReactElement): string => {
	const container = document.createElement("div");
	document.body.append(container);
	const root = createRoot(container);
	act(() => {
		root.render(element);
	});
	const className = Array.from(
		container.firstElementChild?.classList ?? [],
	).find((name) => name.startsWith("css-"));
	const css = Array.from(
		document.head.querySelectorAll("style"),
		(style) => style.textContent ?? "",
	).join("\n");
	act(() => {
		root.unmount();
	});
	const rule = css
		.split("}")
		.find(
			(block) => className !== undefined && block.includes(`.${className}`),
		);
	return /background:([^;]*)/.exec(rule ?? "")?.[1] ?? "";
};

afterEach(() => {
	document.body.innerHTML = "";
});

describe.each([
	{
		name: "PropertyColorSwatch",
		render: (color: string) => <PropertyColorSwatch swatchColor={color} />,
	},
	{
		name: "PropertyColorMixedSwatchSegment",
		render: (color: string) => (
			<PropertyColorMixedSwatchSegment swatchColor={color} widthFraction={1} />
		),
	},
	{
		name: "ColorSwatch",
		render: (color: string) => (
			<ColorSwatch swatchColor={color} selected={false} />
		),
	},
])("$name background", ({ render }) => {
	it.each(["", "transparent", "#ffffff00", "rgba(255, 0, 0, 0)"])(
		"draws %s, which paints nothing, as the checker",
		(color) => {
			expect(backgroundRuleOf(render(color))).toContain(CHECKER);
		},
	);

	it("draws an opaque color as itself", () => {
		const background = backgroundRuleOf(render("#ff0000"));
		expect(background).toContain("#ff0000");
		expect(background).not.toContain(CHECKER);
	});
});
