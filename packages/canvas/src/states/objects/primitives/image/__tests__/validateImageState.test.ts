import { describe, expect, it } from "vitest";

import { isImageState } from "../ImageState";
import { isValidImageState } from "../validateImageState";

const validImage = {
	id: "v1",
	type: "image",
	cx: 0,
	cy: 0,
	width: 200,
	height: 120,
	rotation: 0,
	scaleX: 1,
	scaleY: 1,
	src: "images/logo.png",
};

describe("isValidImageState", () => {
	it("valid Image is true", () => {
		expect(isValidImageState(validImage)).toBe(true);
	});

	it("type mismatch / missing required geometry is false", () => {
		expect(isValidImageState({ ...validImage, type: "rect" })).toBe(false);
		expect(isValidImageState({ ...validImage, width: undefined })).toBe(false);
	});

	it("negative width / height is false (minimum: 0)", () => {
		expect(isValidImageState({ ...validImage, height: -1 })).toBe(false);
	});

	it("src that is not a string / missing is false", () => {
		expect(isValidImageState({ ...validImage, src: undefined })).toBe(false);
		expect(isValidImageState({ ...validImage, src: 123 })).toBe(false);
	});

	it("src that is the empty string is false", () => {
		expect(isValidImageState({ ...validImage, src: "" })).toBe(false);
	});
});

describe("isImageState", () => {
	it("accepts an image state", () => {
		expect(isImageState(validImage)).toBe(true);
	});

	it("rejects another type, a src that is not a string, and a non-object", () => {
		expect(isImageState({ ...validImage, type: "svg" })).toBe(false);
		expect(isImageState({ ...validImage, src: 1 })).toBe(false);
		expect(isImageState(null)).toBe(false);
	});
});
