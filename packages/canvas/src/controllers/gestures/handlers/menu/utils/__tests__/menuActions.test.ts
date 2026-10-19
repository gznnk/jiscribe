import { describe, expect, it } from "vitest";

import {
	commandAction,
	documentAction,
	parseMenuAction,
	setAction,
	sliderAction,
	toggleAction,
} from "../menuActions";

describe("menuActions", () => {
	it("reads back what each builder wrote", () => {
		expect(parseMenuAction(commandAction("zoomIn"))).toEqual({
			kind: "command",
			commandId: "zoomIn",
		});
		expect(parseMenuAction(toggleAction("font-size"))).toEqual({
			kind: "toggle",
			id: "font-size",
		});
		expect(parseMenuAction(setAction("fill", "#dc2626"))).toEqual({
			kind: "set",
			property: "fill",
			value: "#dc2626",
		});
		expect(parseMenuAction(sliderAction("strokeWidth"))).toEqual({
			kind: "slider",
			property: "strokeWidth",
		});
	});

	it("keeps a separator inside a set value with the value", () => {
		// A font stack or a URL-ish value carries its own colons; only the first
		// one after the property splits.
		expect(parseMenuAction(setAction("fontFamily", "a:b:c"))).toEqual({
			kind: "set",
			property: "fontFamily",
			value: "a:b:c",
		});
	});

	it("writes the DOM strings the e2e selectors look for", () => {
		expect(commandAction("togglePropertyPanel")).toBe(
			"command:togglePropertyPanel",
		);
		expect(toggleAction("fill")).toBe("toggle:fill");
		expect(setAction("label.fontWeight", "bold")).toBe(
			"set:label.fontWeight:bold",
		);
		expect(sliderAction("fontSize")).toBe("slider:fontSize");
	});

	it("reads a document action back, with an empty value standing for null", () => {
		expect(parseMenuAction(documentAction("view.open", "fit-width"))).toEqual({
			kind: "doc",
			property: "view.open",
			value: "fit-width",
		});
		expect(parseMenuAction(documentAction("view.scroll", null))).toEqual({
			kind: "doc",
			property: "view.scroll",
			value: null,
		});
		expect(documentAction("view.scroll", "content")).toBe(
			"doc:view.scroll:content",
		);
		// A document action with nothing after the property has no value to write.
		expect(parseMenuAction("doc:view.open")).toBeNull();
	});

	it("gives null for a press on the body and for anything outside the grammar", () => {
		expect(parseMenuAction(undefined)).toBeNull();
		expect(parseMenuAction("")).toBeNull();
		expect(parseMenuAction("panel")).toBeNull();
		expect(parseMenuAction("section:layout")).toBeNull();
		// A set with nothing after the property has no value to write.
		expect(parseMenuAction("set:fill")).toBeNull();
	});
});
