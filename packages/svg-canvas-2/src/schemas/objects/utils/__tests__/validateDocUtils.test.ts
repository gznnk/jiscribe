import { describe, it, expect } from "vitest";

import {
	validateArrowFields,
	validateEndpointRef,
	validateFillStyleFields,
	validatePolyFields,
	validateRadiusStyleFields,
	validateStrokeStyleFields,
	validateTextStyleFields,
	validateTransformFields,
} from "../validateDocUtils";

// ─── validatePolyFields ───────────────────────────────────────────

describe("validatePolyFields", () => {
	it("有効な points 配列はエラーなし", () => {
		const o = {
			points: [
				{ x: 0, y: 0 },
				{ x: 10, y: 10 },
			],
		};
		expect(validatePolyFields(o, "root")).toEqual([]);
	});

	it("3点以上でもエラーなし", () => {
		const o = {
			points: [
				{ x: 0, y: 0 },
				{ x: 5, y: 5 },
				{ x: 10, y: 0 },
			],
		};
		expect(validatePolyFields(o, "root")).toEqual([]);
	});

	it("points フィールドがない場合はエラー", () => {
		expect(validatePolyFields({}, "root")).toHaveLength(1);
	});

	it("points が配列でない場合はエラー", () => {
		expect(validatePolyFields({ points: "invalid" }, "root")).toHaveLength(1);
	});

	it("点が { x, y } でない場合はエラー", () => {
		const o = { points: [{ x: 0 }, { x: 10, y: 10 }] };
		expect(validatePolyFields(o, "root")).toHaveLength(1);
	});

	it("1点しかない場合はエラー（2点以上必要）", () => {
		const o = { points: [{ x: 0, y: 0 }] };
		expect(validatePolyFields(o, "root")).toHaveLength(1);
	});

	it("空配列はエラー", () => {
		expect(validatePolyFields({ points: [] }, "root")).toHaveLength(1);
	});

	it("エラーパスに path が反映される", () => {
		const errors = validatePolyFields({}, "obj[0]");
		expect(errors[0].path).toBe("obj[0].points");
	});
});

// ─── validateEndpointRef ──────────────────────────────────────────

describe("validateEndpointRef", () => {
	// null / undefined
	it("null / undefined はエラーなし", () => {
		expect(validateEndpointRef(null, "root")).toEqual([]);
		expect(validateEndpointRef(undefined, "root")).toEqual([]);
	});

	// ── OwnedEndpointRef ──────────────────────────────────────────

	describe("OwnedEndpointRef", () => {
		it("center anchor はエラーなし", () => {
			const ref = {
				owner: { id: "rect-1", type: "rect" },
				anchor: { kind: "center" },
			};
			expect(validateEndpointRef(ref, "root")).toEqual([]);
		});

		it("connectPoint anchor（有効な id）はエラーなし", () => {
			const ref = {
				owner: { id: "rect-1", type: "rect" },
				anchor: { kind: "connectPoint", id: "topCenter" },
			};
			expect(validateEndpointRef(ref, "root")).toEqual([]);
		});

		it("owner.id が string でない場合はエラー", () => {
			const ref = {
				owner: { id: 123, type: "rect" },
				anchor: { kind: "center" },
			};
			const errors = validateEndpointRef(ref, "root");
			expect(errors.some((e) => e.path === "root.owner.id")).toBe(true);
		});

		it("owner.type が string でない場合はエラー", () => {
			const ref = {
				owner: { id: "rect-1", type: 42 },
				anchor: { kind: "center" },
			};
			const errors = validateEndpointRef(ref, "root");
			expect(errors.some((e) => e.path === "root.owner.type")).toBe(true);
		});

		it("anchor が存在しない場合はエラー", () => {
			const ref = { owner: { id: "rect-1", type: "rect" } };
			const errors = validateEndpointRef(ref, "root");
			expect(errors.some((e) => e.path === "root.anchor")).toBe(true);
		});

		it("anchor.kind が free の場合はエラー（owned には不正）", () => {
			const ref = {
				owner: { id: "rect-1", type: "rect" },
				anchor: { kind: "free", point: { x: 0, y: 0 } },
			};
			const errors = validateEndpointRef(ref, "root");
			expect(errors.some((e) => e.path === "root.anchor.kind")).toBe(true);
		});

		it("anchor.kind が不正な値はエラー", () => {
			const ref = {
				owner: { id: "rect-1", type: "rect" },
				anchor: { kind: "unknown" },
			};
			const errors = validateEndpointRef(ref, "root");
			expect(errors.some((e) => e.path === "root.anchor.kind")).toBe(true);
		});

		it("connectPoint anchor で id が不正な値はエラー", () => {
			const ref = {
				owner: { id: "rect-1", type: "rect" },
				anchor: { kind: "connectPoint", id: "invalid" },
			};
			const errors = validateEndpointRef(ref, "root");
			expect(errors.some((e) => e.path === "root.anchor.id")).toBe(true);
		});

		it("全 ConnectPointId はエラーなし", () => {
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
		it("有効な free anchor はエラーなし", () => {
			const ref = { anchor: { kind: "free", point: { x: 10, y: 20 } } };
			expect(validateEndpointRef(ref, "root")).toEqual([]);
		});

		it("owner が null の場合も free endpoint として扱いエラーなし", () => {
			const ref = {
				owner: null,
				anchor: { kind: "free", point: { x: 0, y: 0 } },
			};
			expect(validateEndpointRef(ref, "root")).toEqual([]);
		});

		it("anchor がない場合はエラー", () => {
			const errors = validateEndpointRef({}, "root");
			expect(errors.some((e) => e.path === "root.anchor")).toBe(true);
		});

		it("anchor.kind が free でない場合はエラー", () => {
			const ref = { anchor: { kind: "center" } };
			const errors = validateEndpointRef(ref, "root");
			expect(errors.some((e) => e.path === "root.anchor.kind")).toBe(true);
		});

		it("anchor.point がない場合はエラー", () => {
			const ref = { anchor: { kind: "free" } };
			const errors = validateEndpointRef(ref, "root");
			expect(errors.some((e) => e.path === "root.anchor.point")).toBe(true);
		});

		it("anchor.point.x が数値でない場合はエラー", () => {
			const ref = { anchor: { kind: "free", point: { x: "10", y: 0 } } };
			const errors = validateEndpointRef(ref, "root");
			expect(errors.some((e) => e.path === "root.anchor.point.x")).toBe(true);
		});

		it("anchor.point.y が数値でない場合はエラー", () => {
			const ref = { anchor: { kind: "free", point: { x: 0, y: "20" } } };
			const errors = validateEndpointRef(ref, "root");
			expect(errors.some((e) => e.path === "root.anchor.point.y")).toBe(true);
		});
	});
});

// ─── validateTransformFields ──────────────────────────────────────

describe("validateTransformFields", () => {
	it("transform フィールドがない場合はエラーなし", () => {
		expect(validateTransformFields({}, "root")).toEqual([]);
	});

	it("有効な transform フィールドはエラーなし", () => {
		const o = { rotation: 45, flipX: false, flipY: true };
		expect(validateTransformFields(o, "root")).toEqual([]);
	});

	it("rotation が数値でない場合はエラー", () => {
		const errors = validateTransformFields({ rotation: "45deg" }, "root");
		expect(errors).toHaveLength(1);
		expect(errors[0].path).toBe("root.rotation");
	});

	it("flipX が boolean でない場合はエラー", () => {
		const errors = validateTransformFields({ flipX: 1 }, "root");
		expect(errors).toHaveLength(1);
		expect(errors[0].path).toBe("root.flipX");
	});

	it("flipY が boolean でない場合はエラー", () => {
		const errors = validateTransformFields({ flipY: "true" }, "root");
		expect(errors).toHaveLength(1);
		expect(errors[0].path).toBe("root.flipY");
	});

	it("rotation が 0 はエラーなし", () => {
		expect(validateTransformFields({ rotation: 0 }, "root")).toEqual([]);
	});
});

// ─── validateStrokeStyleFields ────────────────────────────────────

describe("validateStrokeStyleFields", () => {
	it("stroke フィールドがない場合はエラーなし", () => {
		expect(validateStrokeStyleFields({}, "root")).toEqual([]);
	});

	it("有効な stroke フィールドはエラーなし", () => {
		const o = { stroke: "#000", strokeWidth: 2, strokeDashType: "solid" };
		expect(validateStrokeStyleFields(o, "root")).toEqual([]);
	});

	it("stroke が string でない場合はエラー", () => {
		const errors = validateStrokeStyleFields({ stroke: 123 }, "root");
		expect(errors[0].path).toBe("root.stroke");
	});

	it("strokeWidth が数値でない場合はエラー", () => {
		const errors = validateStrokeStyleFields({ strokeWidth: "2px" }, "root");
		expect(errors[0].path).toBe("root.strokeWidth");
	});

	it("strokeDashType が不正な値はエラー", () => {
		const errors = validateStrokeStyleFields(
			{ strokeDashType: "double" },
			"root",
		);
		expect(errors[0].path).toBe("root.strokeDashType");
	});

	it("strokeDashType: dashed / dotted はエラーなし", () => {
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
	it("fill がない場合はエラーなし", () => {
		expect(validateFillStyleFields({}, "root")).toEqual([]);
	});

	it("fill が string はエラーなし", () => {
		expect(validateFillStyleFields({ fill: "transparent" }, "root")).toEqual(
			[],
		);
	});

	it("fill が string でない場合はエラー", () => {
		const errors = validateFillStyleFields({ fill: 0xff0000 }, "root");
		expect(errors[0].path).toBe("root.fill");
	});
});

// ─── validateTextStyleFields ──────────────────────────────────────

describe("validateTextStyleFields", () => {
	it("text フィールドがない場合はエラーなし", () => {
		expect(validateTextStyleFields({}, "root")).toEqual([]);
	});

	it("有効なテキストフィールドはエラーなし", () => {
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

	it("textAlign が不正な値はエラー", () => {
		const errors = validateTextStyleFields({ textAlign: "justify" }, "root");
		expect(errors[0].path).toBe("root.textAlign");
	});

	it("textAlign: left / right はエラーなし", () => {
		expect(validateTextStyleFields({ textAlign: "left" }, "root")).toEqual([]);
		expect(validateTextStyleFields({ textAlign: "right" }, "root")).toEqual([]);
	});

	it("verticalAlign が不正な値はエラー", () => {
		const errors = validateTextStyleFields(
			{ verticalAlign: "baseline" },
			"root",
		);
		expect(errors[0].path).toBe("root.verticalAlign");
	});

	it("verticalAlign: top / bottom はエラーなし", () => {
		expect(validateTextStyleFields({ verticalAlign: "top" }, "root")).toEqual(
			[],
		);
		expect(
			validateTextStyleFields({ verticalAlign: "bottom" }, "root"),
		).toEqual([]);
	});

	it("textType: markdown はエラーなし", () => {
		expect(validateTextStyleFields({ textType: "markdown" }, "root")).toEqual(
			[],
		);
	});

	it("textType が不正な値はエラー", () => {
		const errors = validateTextStyleFields({ textType: "html" }, "root");
		expect(errors[0].path).toBe("root.textType");
	});

	it("fontSize が数値でない場合はエラー", () => {
		const errors = validateTextStyleFields({ fontSize: "16px" }, "root");
		expect(errors[0].path).toBe("root.fontSize");
	});

	it("fontColor が string でない場合はエラー", () => {
		const errors = validateTextStyleFields({ fontColor: 0 }, "root");
		expect(errors[0].path).toBe("root.fontColor");
	});
});

// ─── validateRadiusStyleFields ────────────────────────────────────

describe("validateRadiusStyleFields", () => {
	it("rx がない場合はエラーなし", () => {
		expect(validateRadiusStyleFields({}, "root")).toEqual([]);
	});

	it("rx が数値はエラーなし", () => {
		expect(validateRadiusStyleFields({ rx: 8 }, "root")).toEqual([]);
		expect(validateRadiusStyleFields({ rx: 0 }, "root")).toEqual([]);
	});

	it("rx が数値でない場合はエラー", () => {
		const errors = validateRadiusStyleFields({ rx: "8px" }, "root");
		expect(errors[0].path).toBe("root.rx");
	});
});

// ─── validateArrowFields ──────────────────────────────────────────

describe("validateArrowFields", () => {
	it("arrow フィールドがない場合はエラーなし", () => {
		expect(validateArrowFields({}, "root")).toEqual([]);
	});

	it("有効な ArrowType はエラーなし", () => {
		const o = { startArrow: "FilledTriangle", endArrow: "None" };
		expect(validateArrowFields(o, "root")).toEqual([]);
	});

	it("startArrow が不正な値はエラー", () => {
		const errors = validateArrowFields({ startArrow: "arrow" }, "root");
		expect(errors[0].path).toBe("root.startArrow");
	});

	it("endArrow が不正な値はエラー", () => {
		const errors = validateArrowFields({ endArrow: "diamond" }, "root");
		expect(errors[0].path).toBe("root.endArrow");
	});

	it("全 ArrowType 値はエラーなし", () => {
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
