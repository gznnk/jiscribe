import { afterEach, describe, it, expect, vi } from "vitest";

import { toStyleIntent } from "../toStyleIntent";

describe("toStyleIntent (the one translation)", () => {
	describe("the core vocabulary becomes a typed intent", () => {
		it("a color is carried as it stands", () => {
			expect(toStyleIntent("fill", "#123456")).toEqual({
				kind: "fill",
				color: "#123456",
			});
			expect(toStyleIntent("stroke", "auto")).toEqual({
				kind: "stroke",
				color: "auto",
			});
		});

		it("a number property is read as one", () => {
			expect(toStyleIntent("strokeWidth", "3")).toEqual({
				kind: "strokeWidth",
				width: 3,
			});
			expect(toStyleIntent("fontSize", "24")).toEqual({
				kind: "fontSize",
				size: 24,
			});
			expect(toStyleIntent("fillOpacity", "0.5")).toEqual({
				kind: "fillOpacity",
				opacity: 0.5,
			});
		});

		it("a string no number can be made of states nothing", () => {
			expect(toStyleIntent("strokeWidth", "abc")).toBeUndefined();
			expect(toStyleIntent("fontSize", "12px")).toBeUndefined();
		});

		it("a name differing from the intent it states is mapped, not passed through", () => {
			// The part is named after the field the radius is stored in, the intent
			// after what it means.
			expect(toStyleIntent("rx", "8")).toEqual({
				kind: "cornerRadius",
				radius: 8,
			});
			expect(toStyleIntent("text", "Yes")).toEqual({
				kind: "textContent",
				text: "Yes",
			});
		});

		it("the two switches read their own values", () => {
			expect(toStyleIntent("lockAspectRatio", "true")).toEqual({
				kind: "lockAspectRatio",
				locked: true,
			});
			// Anything but "true" is off, the reading coerceStyleValue gives a boolean.
			expect(toStyleIntent("lockAspectRatio", "false")).toEqual({
				kind: "lockAspectRatio",
				locked: false,
			});
			expect(toStyleIntent("textVerticalBasis", "frame")).toEqual({
				kind: "textVerticalBasis",
				basis: "frame",
			});
		});

		it("a basis that is neither box throws rather than stating an intent", () => {
			expect(() => toStyleIntent("textVerticalBasis", "middle")).toThrow(
				/textVerticalBasis/,
			);
		});
	});

	describe("a core intent kind no property is named after is refused", () => {
		afterEach(() => {
			vi.restoreAllMocks();
		});

		it.each([
			["underline", "false", "textDecoration"],
			["strikethrough", "true", "textDecoration"],
			["cornerRadius", "8", "rx"],
			["textContent", "Yes", "text"],
		])(
			"%s states nothing and warns to use %s's property",
			(kind, value, propertyToUse) => {
				const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
				expect(toStyleIntent(kind, value)).toBeUndefined();
				expect(warn).toHaveBeenCalledOnce();
				expect(warn.mock.calls[0]?.[0]).toContain(`"${propertyToUse}"`);
			},
		);

		it("the property names stating those kinds are unchanged", () => {
			const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
			expect(toStyleIntent("textDecoration", "underline")).toEqual({
				kind: "textDecoration",
				decoration: "underline",
			});
			expect(toStyleIntent("rx", "4")).toEqual({
				kind: "cornerRadius",
				radius: 4,
			});
			expect(toStyleIntent("text", "Hi")).toEqual({
				kind: "textContent",
				text: "Hi",
			});
			expect(toStyleIntent("fill", "#000")).toEqual({
				kind: "fill",
				color: "#000",
			});
			expect(toStyleIntent("headerHeight", "32")).toEqual({
				kind: "headerHeight",
				value: "32",
			});
			expect(warn).not.toHaveBeenCalled();
		});
	});

	describe("a name the vocabulary does not own is a shape's own declaration", () => {
		it("the name and the string are passed on as they stand", () => {
			expect(toStyleIntent("headerFill", "#ff0000")).toEqual({
				kind: "headerFill",
				value: "#ff0000",
			});
		});

		it("a write path keeps its dots, which is how the entry lands", () => {
			expect(toStyleIntent("label.fontSize", "12")).toEqual({
				kind: "label.fontSize",
				value: "12",
			});
		});

		it("a name nobody declares is still stated; the tables are what refuse it", () => {
			expect(toStyleIntent("notAProperty", "x")).toEqual({
				kind: "notAProperty",
				value: "x",
			});
		});
	});
});
