import { describe, it, expect } from "vitest";

import { validateTransformFields } from "../validateTransformFields";

// ─── validateTransformFields ──────────────────────────────────────

describe("validateTransformFields", () => {
	it("no errors when the transform fields are missing", () => {
		expect(validateTransformFields({}, "root")).toEqual([]);
	});

	it("valid transform fields have no errors", () => {
		const o = { rotation: 45, flipX: false, flipY: true };
		expect(validateTransformFields(o, "root")).toEqual([]);
	});

	it("lockAspectRatio true / false has no errors", () => {
		expect(validateTransformFields({ lockAspectRatio: true }, "root")).toEqual(
			[],
		);
		expect(validateTransformFields({ lockAspectRatio: false }, "root")).toEqual(
			[],
		);
	});

	it("errors when rotation is not a number", () => {
		const errors = validateTransformFields({ rotation: "45deg" }, "root");
		expect(errors).toHaveLength(1);
		expect(errors[0].path).toBe("root.rotation");
	});

	it("errors when flipX is not a boolean", () => {
		const errors = validateTransformFields({ flipX: 1 }, "root");
		expect(errors).toHaveLength(1);
		expect(errors[0].path).toBe("root.flipX");
	});

	it("errors when flipY is not a boolean", () => {
		const errors = validateTransformFields({ flipY: "true" }, "root");
		expect(errors).toHaveLength(1);
		expect(errors[0].path).toBe("root.flipY");
	});

	it("errors when lockAspectRatio is not a boolean", () => {
		// A truthy string like "no" would otherwise read as "locked" at use.
		const errors = validateTransformFields({ lockAspectRatio: "no" }, "root");
		expect(errors).toHaveLength(1);
		expect(errors[0].path).toBe("root.lockAspectRatio");
	});

	it("rotation === 0 has no errors", () => {
		expect(validateTransformFields({ rotation: 0 }, "root")).toEqual([]);
	});
});
