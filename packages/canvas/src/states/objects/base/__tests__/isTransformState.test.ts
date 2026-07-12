import { describe, expect, it } from "vitest";

import { isTransformState } from "../TransformState";

const validTransform = { rotation: 0, scaleX: 1, scaleY: 1 };

describe("isTransformState", () => {
	it("accepts a Transform with rotation/scaleX/scaleY all present", () => {
		expect(isTransformState(validTransform)).toBe(true);
	});

	it("accepts lockAspectRatio when it is a boolean", () => {
		expect(isTransformState({ ...validTransform, lockAspectRatio: true })).toBe(
			true,
		);
		expect(
			isTransformState({ ...validTransform, lockAspectRatio: false }),
		).toBe(true);
	});

	it("ignores lockAspectRatio and accepts when it is undefined", () => {
		expect(
			isTransformState({ ...validTransform, lockAspectRatio: undefined }),
		).toBe(true);
	});

	it("rejects lockAspectRatio when it is not a boolean", () => {
		expect(
			isTransformState({ ...validTransform, lockAspectRatio: "yes" }),
		).toBe(false);
	});

	it("accepts minWidth / minHeight when they are numbers or undefined", () => {
		expect(
			isTransformState({ ...validTransform, minWidth: 10, minHeight: 20 }),
		).toBe(true);
		expect(
			isTransformState({
				...validTransform,
				minWidth: undefined,
				minHeight: undefined,
			}),
		).toBe(true);
	});

	it("rejects minWidth / minHeight when they are not numbers", () => {
		expect(isTransformState({ ...validTransform, minWidth: "10" })).toBe(false);
		expect(isTransformState({ ...validTransform, minHeight: "20" })).toBe(
			false,
		);
	});

	it("rejects when a required Transform property is missing", () => {
		expect(isTransformState({ scaleX: 1, scaleY: 1 })).toBe(false);
		expect(isTransformState({ rotation: 0, scaleY: 1 })).toBe(false);
	});

	it("rejects non-objects", () => {
		expect(isTransformState(null)).toBe(false);
		expect(isTransformState(undefined)).toBe(false);
		expect(isTransformState(42)).toBe(false);
		expect(isTransformState("transform")).toBe(false);
	});
});
