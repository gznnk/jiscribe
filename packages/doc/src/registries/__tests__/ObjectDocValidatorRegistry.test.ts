import { describe, expect, it } from "vitest";

import { ConnectorFeatures } from "../../model/objects/connector/ConnectorDoc";
import { GroupFeatures } from "../../model/objects/primitives/group/GroupDoc";
import { PolygonFeatures } from "../../model/objects/primitives/polygon/PolygonDoc";
import { RectFeatures } from "../../model/objects/primitives/rect/RectDoc";
import { TextFeatures } from "../../model/objects/primitives/text/TextDoc";
import type { ObjectFeatures } from "../../model/objects/types/ObjectFeatures";
import type { SemanticDiagnostic } from "../../model/types/SemanticDiagnostic";
import type { ObjectDocValidateFn } from "../../plugin/ObjectDocValidateFn";
import { createObjectDocValidatorRegistry } from "../ObjectDocValidatorRegistry";

const noopValidate: ObjectDocValidateFn = () => [];

/** A registry holding one type, checked through the entry point the parser uses. */
const validateWith = (
	features: ObjectFeatures,
	obj: Record<string, unknown>,
	extraKeys?: readonly string[],
	validateDoc: ObjectDocValidateFn = noopValidate,
): SemanticDiagnostic[] => {
	const registry = createObjectDocValidatorRegistry();
	registry.register(features.type, { features, validateDoc, extraKeys });
	return registry.validate(features.type, obj, "root[0]");
};

describe("ObjectDocValidatorRegistry", () => {
	it("hasType answers for a registered type and for one never registered", () => {
		const registry = createObjectDocValidatorRegistry();
		registry.register("rect", {
			features: RectFeatures,
			validateDoc: noopValidate,
		});

		expect(registry.hasType("rect")).toBe(true);
		expect(registry.hasType("no-such-type")).toBe(false);
	});

	it("hasType stays true for a type whose validator reports errors", () => {
		// Registration is what it answers about — whether a given doc passes is a
		// separate question, and the two are read together at the parse boundary.
		const registry = createObjectDocValidatorRegistry();
		registry.register("rect", {
			features: RectFeatures,
			validateDoc: () => [
				{ path: "root[0]", message: "always fails", severity: "error" },
			],
		});

		expect(registry.hasType("rect")).toBe(true);
	});

	it("reports nothing at all for a type it does not hold", () => {
		// An object of an unknown type is opaque: its fields are not ours to judge.
		const registry = createObjectDocValidatorRegistry();
		expect(
			registry.validate("hexagram", { id: "u", zzUnknown: 1 }, "root[0]"),
		).toEqual([]);
	});
});

describe("ObjectDocValidatorRegistry unknown properties", () => {
	it("reports one warning per name the type does not hold", () => {
		expect(
			validateWith(RectFeatures, {
				id: "r1",
				type: "rect",
				x: 0,
				y: 0,
				width: 10,
				height: 10,
				zzUnknown: 1,
			}),
		).toEqual([
			{
				path: "root[0].zzUnknown",
				message:
					'Unknown property "zzUnknown" on a "rect": it was ignored and will be dropped on save.',
				severity: "warning",
				unknownKeyPath: ["zzUnknown"],
			},
		]);
	});

	it("puts the warnings after the type's own diagnostics", () => {
		const diagnostics = validateWith(
			RectFeatures,
			{ id: "r1", type: "rect", zzUnknown: 1 },
			undefined,
			(_o, path) => [
				{ path: `${path}.tail`, message: "is required", severity: "error" },
			],
		);
		expect(diagnostics.map((diagnostic) => diagnostic.path)).toEqual([
			"root[0].tail",
			"root[0].zzUnknown",
		]);
	});

	it("reports nothing for a doc holding only the names the features imply", () => {
		expect(
			validateWith(RectFeatures, {
				id: "r1",
				type: "rect",
				meta: { name: "a" },
				x: 0,
				y: 0,
				width: 10,
				height: 10,
				rotation: 0,
				flipX: false,
				flipY: false,
				lockAspectRatio: false,
				stroke: "#000",
				strokeWidth: 2,
				strokeDashType: "solid",
				strokeOpacity: 1,
				fill: "#fff",
				fillOpacity: 1,
				text: "hi",
				textAlign: "center",
				verticalAlign: "middle",
				fontColor: "#000",
				fontSize: 16,
				fontFamily: "Noto Sans JP",
				fontWeight: "bold",
				fontStyle: "italic",
				textDecoration: "underline",
				textVerticalBasis: "frame",
			}),
		).toEqual([]);
	});

	it("accepts the names the definition declares for the type, and only those", () => {
		const doc = { id: "c1", type: "rect", tail: { x: 0, y: 0 } };
		expect(validateWith(RectFeatures, doc, ["tail"])).toEqual([]);
		expect(
			validateWith(RectFeatures, doc).map(
				(diagnostic) => diagnostic.unknownKeyPath,
			),
		).toEqual([["tail"]]);
	});

	it.each([
		["rect", RectFeatures, { x: 0, y: 0, width: 1, height: 1 }],
		["poly", PolygonFeatures, { points: [{ x: 0, y: 0 }] }],
		["point", TextFeatures, { x: 0, y: 0 }],
		["none", GroupFeatures, {}],
	])(
		"leaves %s's own coordinates out of the unknown names",
		(_geometry, features, coordinates) => {
			expect(
				validateWith(features, {
					id: "a",
					type: features.type,
					...coordinates,
				}),
			).toEqual([]);
		},
	);

	it("reaches a type built without createFrameDocValidator, such as connector", () => {
		// The check is the registry's, not the frame validator's, so the poly
		// family is covered by the same code path.
		expect(
			validateWith(
				ConnectorFeatures,
				{ id: "c1", type: "connector", zzUnknown: 1 },
				["source", "target", "routing", "label"],
			).map((diagnostic) => diagnostic.unknownKeyPath),
		).toEqual([["zzUnknown"]]);
	});
});
