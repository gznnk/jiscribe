import { describe, expect, it } from "vitest";

import { isTransformState } from "../TransformState";

const validTransform = { rotation: 0, scaleX: 1, scaleY: 1 };

describe("isTransformState", () => {
	it("rotation/scaleX/scaleY が揃った Transform を受け入れる", () => {
		expect(isTransformState(validTransform)).toBe(true);
	});

	it("lockAspectRatio が boolean なら受け入れる", () => {
		expect(isTransformState({ ...validTransform, lockAspectRatio: true })).toBe(
			true,
		);
		expect(
			isTransformState({ ...validTransform, lockAspectRatio: false }),
		).toBe(true);
	});

	it("lockAspectRatio が undefined なら無視して受け入れる", () => {
		expect(
			isTransformState({ ...validTransform, lockAspectRatio: undefined }),
		).toBe(true);
	});

	it("lockAspectRatio が boolean 以外なら拒否する", () => {
		expect(
			isTransformState({ ...validTransform, lockAspectRatio: "yes" }),
		).toBe(false);
	});

	it("Transform の必須プロパティが欠けていれば拒否する", () => {
		expect(isTransformState({ scaleX: 1, scaleY: 1 })).toBe(false);
		expect(isTransformState({ rotation: 0, scaleY: 1 })).toBe(false);
	});

	it("オブジェクト以外は拒否する", () => {
		expect(isTransformState(null)).toBe(false);
		expect(isTransformState(undefined)).toBe(false);
		expect(isTransformState(42)).toBe(false);
		expect(isTransformState("transform")).toBe(false);
	});
});
