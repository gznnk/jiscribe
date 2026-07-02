import { describe, it, expect } from "vitest";

import {
	validateArrowFields,
	validateEndpointRef,
	validateFillStyleFields,
	validatePolyFields,
	validateRadiusStyleFields,
	validateRequiredNumber,
	validateStrokeStyleFields,
	validateTextStyleFields,
	validateTransformFields,
} from "../validateDocUtils";

// ─── validatePolyFields ───────────────────────────────────────────

describe("validatePolyFields", () => {
	it("a valid points array has no errors", () => {
		const o = {
			points: [
				{ x: 0, y: 0 },
				{ x: 10, y: 10 },
			],
		};
		expect(validatePolyFields(o, "root")).toEqual([]);
	});

	it("no errors even with 3 or more points", () => {
		const o = {
			points: [
				{ x: 0, y: 0 },
				{ x: 5, y: 5 },
				{ x: 10, y: 0 },
			],
		};
		expect(validatePolyFields(o, "root")).toEqual([]);
	});

	it("errors when the points field is missing", () => {
		expect(validatePolyFields({}, "root")).toHaveLength(1);
	});

	it("errors when points is not an array", () => {
		expect(validatePolyFields({ points: "invalid" }, "root")).toHaveLength(1);
	});

	it("errors when a point is not { x, y }", () => {
		const o = { points: [{ x: 0 }, { x: 10, y: 10 }] };
		expect(validatePolyFields(o, "root")).toHaveLength(1);
	});

	it("errors when there is only 1 point (at least 2 required)", () => {
		const o = { points: [{ x: 0, y: 0 }] };
		expect(validatePolyFields(o, "root")).toHaveLength(1);
	});

	it("errors for an empty array", () => {
		expect(validatePolyFields({ points: [] }, "root")).toHaveLength(1);
	});

	it("with minPoints=3, 2 points is an error (for polygon)", () => {
		const o = {
			points: [
				{ x: 0, y: 0 },
				{ x: 10, y: 0 },
			],
		};
		const errors = validatePolyFields(o, "root", 3);
		expect(errors).toHaveLength(1);
		expect(errors[0].message).toContain("at least 3 points");
	});

	it("with minPoints=3, 3 points has no errors", () => {
		const o = {
			points: [
				{ x: 0, y: 0 },
				{ x: 10, y: 0 },
				{ x: 5, y: 10 },
			],
		};
		expect(validatePolyFields(o, "root", 3)).toEqual([]);
	});

	it("the path is reflected in the error path", () => {
		const errors = validatePolyFields({}, "obj[0]");
		expect(errors[0].path).toBe("obj[0].points");
	});
});

// ─── validateEndpointRef ──────────────────────────────────────────

describe("validateEndpointRef", () => {
	// null / undefined
	it("null / undefined has no errors", () => {
		expect(validateEndpointRef(null, "root")).toEqual([]);
		expect(validateEndpointRef(undefined, "root")).toEqual([]);
	});

	// ── OwnedEndpointRef ──────────────────────────────────────────

	describe("OwnedEndpointRef", () => {
		it("center anchor has no errors", () => {
			const ref = {
				owner: { id: "rect-1", type: "rect" },
				anchor: { kind: "center" },
			};
			expect(validateEndpointRef(ref, "root")).toEqual([]);
		});

		it("connectPoint anchor (with a valid id) has no errors", () => {
			const ref = {
				owner: { id: "rect-1", type: "rect" },
				anchor: { kind: "connectPoint", id: "topCenter" },
			};
			expect(validateEndpointRef(ref, "root")).toEqual([]);
		});

		it("errors when owner.id is not a string", () => {
			const ref = {
				owner: { id: 123, type: "rect" },
				anchor: { kind: "center" },
			};
			const errors = validateEndpointRef(ref, "root");
			expect(errors.some((e) => e.path === "root.owner.id")).toBe(true);
		});

		it("errors when owner.type is not a string", () => {
			const ref = {
				owner: { id: "rect-1", type: 42 },
				anchor: { kind: "center" },
			};
			const errors = validateEndpointRef(ref, "root");
			expect(errors.some((e) => e.path === "root.owner.type")).toBe(true);
		});

		it("errors when anchor is missing", () => {
			const ref = { owner: { id: "rect-1", type: "rect" } };
			const errors = validateEndpointRef(ref, "root");
			expect(errors.some((e) => e.path === "root.anchor")).toBe(true);
		});

		it("errors when anchor.kind is free (invalid for owned)", () => {
			const ref = {
				owner: { id: "rect-1", type: "rect" },
				anchor: { kind: "free", point: { x: 0, y: 0 } },
			};
			const errors = validateEndpointRef(ref, "root");
			expect(errors.some((e) => e.path === "root.anchor.kind")).toBe(true);
		});

		it("errors for an invalid anchor.kind value", () => {
			const ref = {
				owner: { id: "rect-1", type: "rect" },
				anchor: { kind: "unknown" },
			};
			const errors = validateEndpointRef(ref, "root");
			expect(errors.some((e) => e.path === "root.anchor.kind")).toBe(true);
		});

		it("errors for an invalid id in a connectPoint anchor", () => {
			const ref = {
				owner: { id: "rect-1", type: "rect" },
				anchor: { kind: "connectPoint", id: "invalid" },
			};
			const errors = validateEndpointRef(ref, "root");
			expect(errors.some((e) => e.path === "root.anchor.id")).toBe(true);
		});

		it("all ConnectPointIds have no errors", () => {
			const ids = [
				"center",
				"topCenter",
				"rightCenter",
				"bottomCenter",
				"leftCenter",
			];
			for (const id of ids) {
				const ref = {
					owner: { id: "rect-1", type: "rect" },
					anchor: { kind: "connectPoint", id },
				};
				expect(validateEndpointRef(ref, "root")).toEqual([]);
			}
		});
	});

	// ── FreeEndpointRef ───────────────────────────────────────────

	describe("FreeEndpointRef", () => {
		it("a valid free anchor has no errors", () => {
			const ref = { anchor: { kind: "free", point: { x: 10, y: 20 } } };
			expect(validateEndpointRef(ref, "root")).toEqual([]);
		});

		it("treats owner === null as a free endpoint with no errors", () => {
			const ref = {
				owner: null,
				anchor: { kind: "free", point: { x: 0, y: 0 } },
			};
			expect(validateEndpointRef(ref, "root")).toEqual([]);
		});

		it("errors when anchor is missing", () => {
			const errors = validateEndpointRef({}, "root");
			expect(errors.some((e) => e.path === "root.anchor")).toBe(true);
		});

		it("errors when anchor.kind is not free", () => {
			const ref = { anchor: { kind: "center" } };
			const errors = validateEndpointRef(ref, "root");
			expect(errors.some((e) => e.path === "root.anchor.kind")).toBe(true);
		});

		it("errors when anchor.point is missing", () => {
			const ref = { anchor: { kind: "free" } };
			const errors = validateEndpointRef(ref, "root");
			expect(errors.some((e) => e.path === "root.anchor.point")).toBe(true);
		});

		it("errors when anchor.point.x is not a number", () => {
			const ref = { anchor: { kind: "free", point: { x: "10", y: 0 } } };
			const errors = validateEndpointRef(ref, "root");
			expect(errors.some((e) => e.path === "root.anchor.point.x")).toBe(true);
		});

		it("errors when anchor.point.y is not a number", () => {
			const ref = { anchor: { kind: "free", point: { x: 0, y: "20" } } };
			const errors = validateEndpointRef(ref, "root");
			expect(errors.some((e) => e.path === "root.anchor.point.y")).toBe(true);
		});
	});
});

// ─── validateTransformFields ──────────────────────────────────────

describe("validateTransformFields", () => {
	it("no errors when the transform fields are missing", () => {
		expect(validateTransformFields({}, "root")).toEqual([]);
	});

	it("valid transform fields have no errors", () => {
		const o = { rotation: 45, flipX: false, flipY: true };
		expect(validateTransformFields(o, "root")).toEqual([]);
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

	it("rotation === 0 has no errors", () => {
		expect(validateTransformFields({ rotation: 0 }, "root")).toEqual([]);
	});
});

// ─── validateStrokeStyleFields ────────────────────────────────────

describe("validateStrokeStyleFields", () => {
	it("no errors when the stroke fields are missing", () => {
		expect(validateStrokeStyleFields({}, "root")).toEqual([]);
	});

	it("valid stroke fields have no errors", () => {
		const o = { stroke: "#000", strokeWidth: 2, strokeDashType: "solid" };
		expect(validateStrokeStyleFields(o, "root")).toEqual([]);
	});

	it("errors when stroke is not a string", () => {
		const errors = validateStrokeStyleFields({ stroke: 123 }, "root");
		expect(errors[0].path).toBe("root.stroke");
	});

	it("errors when stroke contains a CSS injection", () => {
		const errors = validateStrokeStyleFields(
			{ stroke: "red; } body { background: url(http://evil) " },
			"root",
		);
		expect(errors[0].path).toBe("root.stroke");
		// The CSS-safe check cannot be expressed in the JSON schema, so beyondSchema is set.
		expect(errors[0].beyondSchema).toBe(true);
	});

	it("errors when strokeWidth is not a number", () => {
		const errors = validateStrokeStyleFields({ strokeWidth: "2px" }, "root");
		expect(errors[0].path).toBe("root.strokeWidth");
	});

	it("errors for an invalid strokeDashType value", () => {
		const errors = validateStrokeStyleFields(
			{ strokeDashType: "double" },
			"root",
		);
		expect(errors[0].path).toBe("root.strokeDashType");
	});

	it("strokeDashType: dashed / dotted has no errors", () => {
		expect(
			validateStrokeStyleFields({ strokeDashType: "dashed" }, "root"),
		).toEqual([]);
		expect(
			validateStrokeStyleFields({ strokeDashType: "dotted" }, "root"),
		).toEqual([]);
	});
});

// ─── validateFillStyleFields ──────────────────────────────────────

describe("validateFillStyleFields", () => {
	it("no errors when fill is missing", () => {
		expect(validateFillStyleFields({}, "root")).toEqual([]);
	});

	it("fill as a string has no errors", () => {
		expect(validateFillStyleFields({ fill: "transparent" }, "root")).toEqual(
			[],
		);
	});

	it("errors when fill is not a string", () => {
		const errors = validateFillStyleFields({ fill: 0xff0000 }, "root");
		expect(errors[0].path).toBe("root.fill");
	});

	it("errors when fill contains a CSS breakout", () => {
		const errors = validateFillStyleFields(
			{ fill: "url(http://evil/x)" },
			"root",
		);
		expect(errors[0].path).toBe("root.fill");
	});
});

// ─── validateTextStyleFields ──────────────────────────────────────

describe("validateTextStyleFields", () => {
	it("no errors when the text fields are missing", () => {
		expect(validateTextStyleFields({}, "root")).toEqual([]);
	});

	it("valid text fields have no errors", () => {
		const o = {
			text: "hello",
			textType: "text",
			textAlign: "center",
			verticalAlign: "middle",
			fontColor: "#000",
			fontSize: 16,
			fontFamily: "Noto Sans JP",
			fontWeight: "normal",
		};
		expect(validateTextStyleFields(o, "root")).toEqual([]);
	});

	it("errors for an invalid textAlign value", () => {
		const errors = validateTextStyleFields({ textAlign: "justify" }, "root");
		expect(errors[0].path).toBe("root.textAlign");
	});

	it("textAlign: left / right has no errors", () => {
		expect(validateTextStyleFields({ textAlign: "left" }, "root")).toEqual([]);
		expect(validateTextStyleFields({ textAlign: "right" }, "root")).toEqual([]);
	});

	it("errors for an invalid verticalAlign value", () => {
		const errors = validateTextStyleFields(
			{ verticalAlign: "baseline" },
			"root",
		);
		expect(errors[0].path).toBe("root.verticalAlign");
	});

	it("verticalAlign: top / bottom has no errors", () => {
		expect(validateTextStyleFields({ verticalAlign: "top" }, "root")).toEqual(
			[],
		);
		expect(
			validateTextStyleFields({ verticalAlign: "bottom" }, "root"),
		).toEqual([]);
	});

	it("textType: markdown has no errors", () => {
		expect(validateTextStyleFields({ textType: "markdown" }, "root")).toEqual(
			[],
		);
	});

	it("errors for an invalid textType value", () => {
		const errors = validateTextStyleFields({ textType: "html" }, "root");
		expect(errors[0].path).toBe("root.textType");
	});

	it("errors when fontSize is not a number", () => {
		const errors = validateTextStyleFields({ fontSize: "16px" }, "root");
		expect(errors[0].path).toBe("root.fontSize");
	});

	it("errors when fontColor is not a string", () => {
		const errors = validateTextStyleFields({ fontColor: 0 }, "root");
		expect(errors[0].path).toBe("root.fontColor");
	});

	it("errors when fontColor contains a CSS breakout", () => {
		const errors = validateTextStyleFields(
			{ fontColor: "#000; } body {" },
			"root",
		);
		expect(errors[0].path).toBe("root.fontColor");
	});

	it("errors when fontFamily contains a CSS breakout", () => {
		const errors = validateTextStyleFields(
			{ fontFamily: "Arial; } body { display: none" },
			"root",
		);
		expect(errors[0].path).toBe("root.fontFamily");
	});

	it("errors when fontWeight contains a CSS breakout", () => {
		const errors = validateTextStyleFields(
			{ fontWeight: "bold } html {" },
			"root",
		);
		expect(errors[0].path).toBe("root.fontWeight");
	});
});

// ─── validateRadiusStyleFields ────────────────────────────────────

describe("validateRadiusStyleFields", () => {
	it("no errors when rx is missing", () => {
		expect(validateRadiusStyleFields({}, "root")).toEqual([]);
	});

	it("rx as a number has no errors", () => {
		expect(validateRadiusStyleFields({ rx: 8 }, "root")).toEqual([]);
		expect(validateRadiusStyleFields({ rx: 0 }, "root")).toEqual([]);
	});

	it("errors when rx is not a number", () => {
		const errors = validateRadiusStyleFields({ rx: "8px" }, "root");
		expect(errors[0].path).toBe("root.rx");
	});

	it("errors when rx is negative (>= 0)", () => {
		const errors = validateRadiusStyleFields({ rx: -1 }, "root");
		expect(errors[0].path).toBe("root.rx");
		expect(errors[0].message).toContain(">= 0");
	});
});

// ─── validateArrowFields ──────────────────────────────────────────

describe("validateArrowFields", () => {
	it("no errors when the arrow fields are missing", () => {
		expect(validateArrowFields({}, "root")).toEqual([]);
	});

	it("valid ArrowTypes have no errors", () => {
		const o = { startArrow: "FilledTriangle", endArrow: "None" };
		expect(validateArrowFields(o, "root")).toEqual([]);
	});

	it("errors for an invalid startArrow value", () => {
		const errors = validateArrowFields({ startArrow: "arrow" }, "root");
		expect(errors[0].path).toBe("root.startArrow");
	});

	it("errors for an invalid endArrow value", () => {
		const errors = validateArrowFields({ endArrow: "diamond" }, "root");
		expect(errors[0].path).toBe("root.endArrow");
	});

	it("all ArrowType values have no errors", () => {
		const validTypes = [
			"FilledTriangle",
			"ConcaveTriangle",
			"OpenArrow",
			"HollowTriangle",
			"FilledDiamond",
			"HollowDiamond",
			"Circle",
			"None",
		];
		for (const t of validTypes) {
			expect(validateArrowFields({ startArrow: t }, "root")).toEqual([]);
		}
	});
});

// ─── validateRequiredNumber ───────────────────────────────────────

describe("validateRequiredNumber", () => {
	it("no errors for a number", () => {
		expect(validateRequiredNumber({ w: 5 }, "root", "w")).toEqual([]);
	});

	it("errors for non-numbers (including missing)", () => {
		expect(validateRequiredNumber({}, "root", "w")).toEqual([
			{ path: "root.w", message: "must be a number" },
		]);
		expect(
			validateRequiredNumber({ w: "5" }, "root", "w")[0].message,
		).toContain("must be a number");
	});

	it("with min set, below the bound errors and the boundary has no errors", () => {
		expect(
			validateRequiredNumber({ w: -1 }, "root", "w", 0)[0].message,
		).toContain(">= 0");
		expect(validateRequiredNumber({ w: 0 }, "root", "w", 0)).toEqual([]);
		expect(
			validateRequiredNumber({ w: 0 }, "root", "w", 1)[0].message,
		).toContain(">= 1");
		expect(validateRequiredNumber({ w: 1 }, "root", "w", 1)).toEqual([]);
	});
});

// ─── Lower bounds for optional number fields (via style utils) ────

describe("lower bounds for numeric style fields", () => {
	it("negative strokeWidth errors (>= 0), unspecified is allowed", () => {
		expect(
			validateStrokeStyleFields({ strokeWidth: -1 }, "root")[0].message,
		).toContain(">= 0");
		expect(validateStrokeStyleFields({}, "root")).toEqual([]);
		expect(validateStrokeStyleFields({ strokeWidth: 0 }, "root")).toEqual([]);
	});

	it("fontSize below 1 errors (>= 1), unspecified is allowed", () => {
		expect(
			validateTextStyleFields({ fontSize: 0 }, "root")[0].message,
		).toContain(">= 1");
		expect(validateTextStyleFields({}, "root")).toEqual([]);
		expect(validateTextStyleFields({ fontSize: 1 }, "root")).toEqual([]);
	});
});
