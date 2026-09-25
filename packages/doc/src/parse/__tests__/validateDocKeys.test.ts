import { describe, expect, it } from "vitest";

import {
	CONNECTOR_EXTRA_KEYS,
	ConnectorFeatures,
} from "../../model/objects/connector/ConnectorDoc";
import { GroupFeatures } from "../../model/objects/primitives/group/GroupDoc";
import { PolygonFeatures } from "../../model/objects/primitives/polygon/PolygonDoc";
import { RectFeatures } from "../../model/objects/primitives/rect/RectDoc";
import { TextFeatures } from "../../model/objects/primitives/text/TextDoc";
import type { ObjectFeatures } from "../../model/objects/types/ObjectFeatures";
import type { SemanticDiagnostic } from "../../model/types/SemanticDiagnostic";
import type { ObjectDocValidateFn } from "../../plugin/ObjectDocValidateFn";
import { createDocValidatorRegistry } from "../../registries/ObjectDocValidatorRegistry";
import { validateDocKeys } from "../validateDocKeys";

// The key check as checkStructure runs it: the type's own validator first, then
// the names held against what the registry built at registration — on the object
// itself, then inside the containers doc owns (runs, slots, poly vertices, a
// connector's endpoints, anchors and label).

const noopValidate: ObjectDocValidateFn = () => [];

/** One registered type, checked the way checkStructure checks an object of it. */
const validateWith = (
	features: ObjectFeatures,
	obj: Record<string, unknown>,
	extraKeys?: readonly string[],
	validateDoc: ObjectDocValidateFn = noopValidate,
): SemanticDiagnostic[] => {
	const registry = createDocValidatorRegistry({
		presetDefinitions: {
			[features.type]: { features, validateDoc, extraKeys },
		},
	});
	const typeDiagnostics = registry.validate(features.type, obj, "root[0]");
	const keyDeclaration = registry.getKeyDeclaration(features.type);
	if (keyDeclaration === undefined) {
		throw new Error(`"${features.type}" was just built in`);
	}
	return [
		...typeDiagnostics,
		...validateDocKeys(obj, "root[0]", keyDeclaration, typeDiagnostics),
	];
};

/** A stand-in for a type whose text is named slots, as the uml record's is. */
const slottedFeatures = {
	type: "slotted",
	geometry: "rect",
	transform: true,
	text: "slots",
} as const satisfies ObjectFeatures;

const rectWith = (over: Record<string, unknown>) => ({
	id: "r1",
	type: "rect",
	x: 0,
	y: 0,
	width: 10,
	height: 10,
	...over,
});

const connectorWith = (over: Record<string, unknown>) => ({
	id: "c1",
	type: "connector",
	source: { owner: { id: "a" }, anchor: { kind: "center" } },
	target: { owner: { id: "b" }, anchor: { kind: "center" } },
	...over,
});

const connectorDiagnostics = (
	over: Record<string, unknown>,
): SemanticDiagnostic[] =>
	validateWith(ConnectorFeatures, connectorWith(over), CONNECTOR_EXTRA_KEYS);

/** The located names a check reported, which is what the parser removes. */
const keyPathsOf = (diagnostics: SemanticDiagnostic[]) =>
	diagnostics.map((diagnostic) => diagnostic.unknownKeyPath);

describe("validateDocKeys on the object itself", () => {
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
				id: "r1",
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
		// The check is the parser's, not the frame validator's, so the poly family
		// is covered by the same code path.
		expect(
			validateWith(
				ConnectorFeatures,
				{ id: "c1", type: "connector", zzUnknown: 1 },
				["source", "target", "routing", "label"],
			).map((diagnostic) => diagnostic.unknownKeyPath),
		).toEqual([["zzUnknown"]]);
	});
});

describe("validateDocKeys inside a body of text", () => {
	it("reports a name a run does not hold, located inside the body", () => {
		expect(
			validateWith(RectFeatures, rectWith({ text: [{ text: "a", zz: 1 }] })),
		).toEqual([
			{
				path: "root[0].text[0].zz",
				message:
					'Unknown property "zz" in "text[0]" of a "rect": it was ignored and will be dropped on save.',
				severity: "warning",
				id: "r1",
				unknownKeyPath: ["text", 0, "zz"],
			},
		]);
	});

	it("reports nothing for a run holding only the names it may carry", () => {
		expect(
			validateWith(
				RectFeatures,
				rectWith({
					text: [
						{
							text: "a",
							fontColor: "#000",
							fontSize: 16,
							fontFamily: "Noto Sans JP",
							fontWeight: "bold",
							fontStyle: "italic",
							textDecoration: "underline",
						},
					],
				}),
			),
		).toEqual([]);
	});

	it("reports nothing for a plain string, which holds no run", () => {
		expect(validateWith(RectFeatures, rectWith({ text: "a" }))).toEqual([]);
	});

	it("reaches every run of the body", () => {
		expect(
			keyPathsOf(
				validateWith(
					RectFeatures,
					rectWith({ text: [{ text: "a" }, { text: "b", zz: 1 }] }),
				),
			),
		).toEqual([["text", 1, "zz"]]);
	});
});

describe("validateDocKeys inside a keyed text", () => {
	it("reports a name a slot does not hold", () => {
		expect(
			validateWith(slottedFeatures, {
				id: "s1",
				type: "slotted",
				x: 0,
				y: 0,
				width: 10,
				height: 10,
				text: { name: { text: "a", zz: 1 } },
			}),
		).toEqual([
			{
				path: "root[0].text.name.zz",
				message:
					'Unknown property "zz" in "text.name" of a "slotted": it was ignored and will be dropped on save.',
				severity: "warning",
				id: "s1",
				unknownKeyPath: ["text", "name", "zz"],
			},
		]);
	});

	it("reports a name inside a run of a slot's body", () => {
		const diagnostics = validateWith(slottedFeatures, {
			id: "s1",
			type: "slotted",
			text: { name: { text: [{ text: "a", zz: 1 }] } },
		});
		expect(diagnostics.map((diagnostic) => diagnostic.path)).toEqual([
			"root[0].text.name.text[0].zz",
		]);
		expect(keyPathsOf(diagnostics)).toEqual([
			["text", "name", "text", 0, "zz"],
		]);
	});

	it("reports a name inside a run of a row, the rows being arrays of their own", () => {
		expect(
			validateWith(slottedFeatures, {
				id: "s1",
				type: "slotted",
				text: {
					name: { text: ["plain", [{ text: "a" }, { text: "b", zz: 1 }]] },
				},
			}),
		).toEqual([
			{
				path: "root[0].text.name.text[1][1].zz",
				message:
					'Unknown property "zz" in "text.name.text[1][1]" of a "slotted": it was ignored and will be dropped on save.',
				severity: "warning",
				id: "s1",
				unknownKeyPath: ["text", "name", "text", 1, 1, "zz"],
			},
		]);
	});

	it("reports nothing for slots holding only the names they may carry", () => {
		expect(
			validateWith(slottedFeatures, {
				id: "s1",
				type: "slotted",
				text: {
					name: {
						text: "a",
						textAlign: "center",
						verticalAlign: "middle",
						fontColor: "#000",
						fontSize: 16,
						fontFamily: "Noto Sans JP",
						fontWeight: "bold",
						fontStyle: "italic",
						textDecoration: "underline",
					},
					rows: { text: [["a"], [{ text: "b", fontWeight: "bold" }]] },
				},
			}),
		).toEqual([]);
	});

	it("reports nothing when the text is not a slot map at all, that being a value to reject", () => {
		expect(
			validateWith(slottedFeatures, { id: "s1", type: "slotted", text: "a" }),
		).toEqual([]);
	});
});

describe("validateDocKeys inside a poly geometry", () => {
	it("reports a name a vertex does not hold, located at its position", () => {
		expect(
			validateWith(PolygonFeatures, {
				id: "p1",
				type: "polygon",
				points: [
					{ x: 0, y: 0 },
					{ x: 1, y: 1 },
					{ x: 2, y: 2, zz: 1 },
				],
			}),
		).toEqual([
			{
				path: "root[0].points[2].zz",
				message:
					'Unknown property "zz" in "points[2]" of a "polygon": it was ignored and will be dropped on save.',
				severity: "warning",
				id: "p1",
				unknownKeyPath: ["points", 2, "zz"],
			},
		]);
	});

	it("reports nothing for vertices holding only their coordinates", () => {
		expect(
			validateWith(PolygonFeatures, {
				id: "p1",
				type: "polygon",
				points: [{ x: 0, y: 0 }],
			}),
		).toEqual([]);
	});
});

describe("validateDocKeys inside a connector", () => {
	it("reports a name the endpoint does not hold", () => {
		expect(
			connectorDiagnostics({ source: { owner: { id: "a" }, zz: 1 } }),
		).toEqual([
			{
				path: "root[0].source.zz",
				message:
					'Unknown property "zz" in "source" of a "connector": it was ignored and will be dropped on save.',
				severity: "warning",
				id: "c1",
				unknownKeyPath: ["source", "zz"],
			},
		]);
	});

	it("reports a name the owner reference does not hold", () => {
		expect(
			keyPathsOf(
				connectorDiagnostics({
					target: { owner: { id: "b", zz: 1 }, anchor: { kind: "center" } },
				}),
			),
		).toEqual([["target", "owner", "zz"]]);
	});

	it.each([
		["center", { kind: "center" }],
		["connectPoint", { kind: "connectPoint", id: "topCenter" }],
		["edge", { kind: "edge", side: "top", t: 0.5 }],
	])("reports a name a %s anchor does not hold", (_kind, anchor) => {
		expect(
			keyPathsOf(
				connectorDiagnostics({
					source: { owner: { id: "a" }, anchor: { ...anchor, zz: 1 } },
				}),
			),
		).toEqual([["source", "anchor", "zz"]]);
	});

	it.each([
		["a name another kind holds", { kind: "center", t: 0.5 }, "t"],
		[
			"the free kind's point",
			{ kind: "connectPoint", id: "a", point: {} },
			"point",
		],
	])("tells the kinds apart: %s is unknown", (_case, anchor, key) => {
		expect(
			keyPathsOf(
				connectorDiagnostics({
					source: { owner: { id: "a" }, anchor },
				}),
			),
		).toEqual([["source", "anchor", key]]);
	});

	it("reports a name inside a free anchor's point", () => {
		expect(
			connectorDiagnostics({
				source: { anchor: { kind: "free", point: { x: 0, y: 0, zz: 1 } } },
			}),
		).toEqual([
			{
				path: "root[0].source.anchor.point.zz",
				message:
					'Unknown property "zz" in "source.anchor.point" of a "connector": it was ignored and will be dropped on save.',
				severity: "warning",
				id: "c1",
				unknownKeyPath: ["source", "anchor", "point", "zz"],
			},
		]);
	});

	it("leaves an anchor of an unknown kind alone, the kind being what the validator rejects", () => {
		expect(
			connectorDiagnostics({
				source: { owner: { id: "a" }, anchor: { kind: "corner", zz: 1 } },
			}),
		).toEqual([]);
	});

	it("reports a name the label does not hold", () => {
		expect(connectorDiagnostics({ label: { text: "yes", zz: 1 } })).toEqual([
			{
				path: "root[0].label.zz",
				message:
					'Unknown property "zz" in "label" of a "connector": it was ignored and will be dropped on save.',
				severity: "warning",
				id: "c1",
				unknownKeyPath: ["label", "zz"],
			},
		]);
	});

	it("reports nothing for endpoints, anchors and a label holding only the names they may carry", () => {
		expect(
			connectorDiagnostics({
				points: [{ x: 0, y: 0 }],
				source: {
					owner: { id: "a" },
					anchor: { kind: "edge", side: "left", t: 0.25 },
				},
				target: { anchor: { kind: "free", point: { x: 1, y: 1 } } },
				label: {
					text: "yes",
					position: 0.5,
					offset: 2,
					fontColor: "#000",
					fontFamily: "Noto Sans JP",
					fontSize: 16,
					fontWeight: "bold",
					fill: "#fff",
					stroke: "#000",
					strokeWidth: 1,
					strokeDashType: "solid",
				},
			}),
		).toEqual([]);
	});

	it("reports nothing for containers written as something other than objects", () => {
		expect(
			connectorDiagnostics({
				points: 5,
				source: "a",
				target: { owner: 3, anchor: 7 },
				label: "yes",
			}),
		).toEqual([]);
	});
});

describe("validateDocKeys on an integer-like slot id", () => {
	it("reports it as an error a schema cannot express, the key order not surviving it", () => {
		expect(
			validateWith(slottedFeatures, {
				id: "s1",
				type: "slotted",
				text: { "0": { text: "a" } },
			}),
		).toEqual([
			{
				path: "root[0].text.0",
				message:
					"is a slot id the JS engine would re-order: name the slot something other than a plain number, the key order deciding the default slot and the drawing order.",
				severity: "error",
				beyondSchema: true,
				id: "s1",
			},
		]);
	});

	it("says nothing about what such a slot holds, the slot not being kept at all", () => {
		expect(
			validateWith(slottedFeatures, {
				id: "s1",
				type: "slotted",
				text: { "0": { text: "a", zz: 1 } },
			}).map((diagnostic) => diagnostic.severity),
		).toEqual(["error"]);
	});

	it.each(["1.5", "4294967295", "Infinity", "01", " 1", "row1"])(
		"leaves the id %j alone, its insertion place surviving",
		(slotId) => {
			expect(
				validateWith(slottedFeatures, {
					id: "s1",
					type: "slotted",
					text: { [slotId]: { text: "a" } },
				}),
			).toEqual([]);
		},
	);
});

describe("validateDocKeys against the type's own diagnostics", () => {
	it("drops a warning the type already reported as an error at the same path", () => {
		// What the uml record does with text styling written at the root: the name is
		// one the type does not hold, and its validator says so with the place the
		// value belongs instead.
		const diagnostics = validateWith(
			slottedFeatures,
			{ id: "s1", type: "slotted", fontColor: "#000" },
			undefined,
			(_o, path) => [
				{
					path: `${path}.fontColor`,
					message: "is not a field of a record",
					severity: "error",
				},
			],
		);
		expect(diagnostics).toEqual([
			{
				path: "root[0].fontColor",
				message: "is not a field of a record",
				severity: "error",
			},
		]);
	});

	it("keeps a warning the type reported at another path", () => {
		expect(
			keyPathsOf(
				validateWith(
					slottedFeatures,
					{ id: "s1", type: "slotted", fontColor: "#000" },
					undefined,
					(_o, path) => [
						{
							path: `${path}.text`,
							message: "is required",
							severity: "error",
						},
					],
				).filter((diagnostic) => diagnostic.severity === "warning"),
			),
		).toEqual([["fontColor"]]);
	});

	it("keeps a warning the type only reported as a warning at the same path", () => {
		expect(
			validateWith(RectFeatures, rectWith({ zz: 1 }), undefined, (_o, path) => [
				{ path: `${path}.zz`, message: "looks odd", severity: "warning" },
			]),
		).toHaveLength(2);
	});
});

describe("validateDocKeys without an id to report under", () => {
	it("leaves the id off when the object carries none a reader could use", () => {
		expect(
			validateWith(RectFeatures, { type: "rect", id: 7, zz: 1 }).map(
				(diagnostic) => diagnostic.id,
			),
		).toEqual([undefined]);
	});
});
