import { describe, expect, it } from "vitest";

import {
	commandPart,
	parseMenuPart,
	setPart,
	sliderPart,
	togglePart,
} from "../menuParts";

describe("menuParts", () => {
	it("reads back what each builder wrote", () => {
		expect(parseMenuPart(commandPart("zoomIn"))).toEqual({
			kind: "command",
			commandId: "zoomIn",
		});
		expect(parseMenuPart(togglePart("stack-order"))).toEqual({
			kind: "toggle",
			id: "stack-order",
		});
		expect(parseMenuPart(setPart("fill", "#dc2626"))).toEqual({
			kind: "set",
			property: "fill",
			value: "#dc2626",
		});
		expect(parseMenuPart(sliderPart("strokeWidth"))).toEqual({
			kind: "slider",
			property: "strokeWidth",
		});
	});

	it("keeps a separator inside a set value with the value", () => {
		// A font stack or a URL-ish value carries its own colons; only the first
		// one after the property splits.
		expect(parseMenuPart(setPart("fontFamily", "a:b:c"))).toEqual({
			kind: "set",
			property: "fontFamily",
			value: "a:b:c",
		});
	});

	it("writes the DOM strings the e2e selectors look for", () => {
		expect(commandPart("togglePropertyPanel")).toBe(
			"command:togglePropertyPanel",
		);
		expect(togglePart("fill")).toBe("toggle:fill");
		expect(setPart("label.fontWeight", "bold")).toBe(
			"set:label.fontWeight:bold",
		);
		expect(sliderPart("fontSize")).toBe("slider:fontSize");
	});

	it("gives null for a press on the body and for anything outside the grammar", () => {
		expect(parseMenuPart(undefined)).toBeNull();
		expect(parseMenuPart("")).toBeNull();
		expect(parseMenuPart("panel")).toBeNull();
		expect(parseMenuPart("section:layout")).toBeNull();
		// A set with nothing after the property has no value to write.
		expect(parseMenuPart("set:fill")).toBeNull();
	});
});
