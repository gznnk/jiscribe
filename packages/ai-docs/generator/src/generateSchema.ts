import { readFileSync } from "node:fs";

import type { ObjectDocDefinition } from "@workspace/canvas/doc";

import {
	CANONICAL_TYPE_ORDER,
	TEMPLATE_DEF_TYPES,
	docDefName,
	type CanonicalType,
} from "./manifest";
import { templatePath } from "./paths";

type JsonSchemaNode = Record<string, unknown>;

const handwrittenDefs = JSON.parse(
	readFileSync(templatePath("handwrittenDefs.json"), "utf8"),
) as Record<string, JsonSchemaNode>;

const propertyOverrides = JSON.parse(
	readFileSync(templatePath("propertyOverrides.json"), "utf8"),
) as Record<string, Record<string, JsonSchemaNode>>;

const rootTemplate = JSON.parse(
	readFileSync(templatePath("rootTemplate.json"), "utf8"),
) as JsonSchemaNode;

/** Feature flag → the shared style $def properties it pulls in (as $ref targets). */
const STYLE_PROP_SOURCES: ReadonlyArray<{
	feature: "stroke" | "fill" | "text" | "transform";
	styleDef: "StrokeStyle" | "FillStyle" | "TextStyle" | "TransformStyle";
	props: readonly string[];
}> = [
	{
		feature: "stroke",
		styleDef: "StrokeStyle",
		props: ["stroke", "strokeWidth", "strokeDashType"],
	},
	{ feature: "fill", styleDef: "FillStyle", props: ["fill"] },
	{
		feature: "text",
		styleDef: "TextStyle",
		props: [
			"text",
			"textAlign",
			"verticalAlign",
			"fontColor",
			"fontSize",
			"fontFamily",
			"fontWeight",
			"fontStyle",
			"textDecoration",
		],
	},
	{
		feature: "transform",
		styleDef: "TransformStyle",
		props: ["rotation", "flipX", "flipY", "lockAspectRatio"],
	},
];

function formatDefaultValue(value: unknown): string {
	return typeof value === "string" ? JSON.stringify(value) : String(value);
}

/**
 * Build the inline override node for a property whose default differs from the
 * shared style definition: clone the shared node, then swap the "Default: ..."
 * clause of the description and `default` for the type-specific value.
 */
function buildDefaultOverrideNode(
	sharedNode: JsonSchemaNode,
	value: unknown,
): JsonSchemaNode {
	const sharedDefault = formatDefaultValue(sharedNode.default);
	// Strip only the "Default: ..." clause (up to its sentence end) so trailing
	// sentences such as TextStyle.fontColor's NOTE survive the rewrite.
	const baseDescription = String(sharedNode.description ?? "").replace(
		/\s*Default: [^.]*\.?/,
		"",
	);
	return {
		...sharedNode,
		description: `${baseDescription} Default: ${formatDefaultValue(value)} (overrides the shared default ${sharedDefault}).`,
		default: value,
	};
}

/** Properties of the rect geometry (x/y/width/height). */
function buildRectGeometryProps(
	defaults: Readonly<Record<string, unknown>>,
): Record<string, JsonSchemaNode> {
	return {
		x: {
			description: "Left-edge X coordinate of the bounding box.",
			type: "number",
		},
		y: {
			description: "Top-edge Y coordinate of the bounding box.",
			type: "number",
		},
		width: {
			description: `Bounding-box width in pixels. Default when created from the palette: ${formatDefaultValue(defaults.width)}`,
			type: "number",
			minimum: 0,
		},
		height: {
			description: `Bounding-box height in pixels. Default when created from the palette: ${formatDefaultValue(defaults.height)}`,
			type: "number",
			minimum: 0,
		},
	};
}

/** Properties of the ellipse geometry (cx/cy/rx/ry). */
function buildEllipseGeometryProps(
	defaults: Readonly<Record<string, unknown>>,
): Record<string, JsonSchemaNode> {
	return {
		cx: { description: "Center X coordinate.", type: "number" },
		cy: { description: "Center Y coordinate.", type: "number" },
		rx: {
			description: `Horizontal radius in pixels. Default when created from the palette: ${formatDefaultValue(defaults.rx)}`,
			type: "number",
			minimum: 0,
		},
		ry: {
			description: `Vertical radius in pixels. Default when created from the palette: ${formatDefaultValue(defaults.ry)}`,
			type: "number",
			minimum: 0,
		},
	};
}

/** Assemble one type's $def from its features / description / defaults. */
function buildShapeDef(
	type: string,
	definition: ObjectDocDefinition,
): JsonSchemaNode {
	const { features, description, defaults } = definition;
	if (!description || !defaults) {
		throw new Error(
			`型 "${type}" の $def 生成に description / defaults が必要です`,
		);
	}
	if (features.geometry !== "rect" && features.geometry !== "ellipse") {
		throw new Error(
			`型 "${type}" の geometry "${features.geometry}" は $def を機械生成できません（テンプレに移してください）`,
		);
	}

	const properties: Record<string, JsonSchemaNode> = {
		id: { description: "Unique identifier.", type: "string" },
		type: {
			description: `Must be "${type}".`,
			type: "string",
			const: type,
		},
		meta: { $ref: "#/$defs/MetaDoc" },
	};

	// Handwritten fragments replace a generated property of the same name; names
	// the generator does not emit (e.g. callout's tail) go right after meta,
	// matching the current schema order. A fragment left unapplied (e.g. a style
	// property the shape's features don't enable) is a config error.
	const overrides = propertyOverrides[type] ?? {};
	const unappliedOverrideNames = new Set(Object.keys(overrides));
	const withOverride = (
		name: string,
		generatedNode: JsonSchemaNode,
	): JsonSchemaNode => {
		const override = overrides[name];
		if (!override) {
			return generatedNode;
		}
		unappliedOverrideNames.delete(name);
		return override;
	};
	const generatedPropNames = new Set<string>([
		"x",
		"y",
		"width",
		"height",
		"cx",
		"cy",
		"rx",
		"ry",
		...STYLE_PROP_SOURCES.flatMap((source) => source.props),
	]);
	for (const [name, node] of Object.entries(overrides)) {
		if (!generatedPropNames.has(name)) {
			properties[name] = node;
			unappliedOverrideNames.delete(name);
		}
	}

	const geometryProps =
		features.geometry === "rect"
			? buildRectGeometryProps(defaults)
			: buildEllipseGeometryProps(defaults);
	for (const [name, node] of Object.entries(geometryProps)) {
		properties[name] = withOverride(name, node);
	}

	if (features.radius) {
		if (defaults.rx === undefined) {
			throw new Error(
				`型 "${type}" は radius を宣言していますが defaults.rx がありません`,
			);
		}
		properties.rx = withOverride("rx", {
			description: `Corner radius (SVG rx). Default: ${formatDefaultValue(defaults.rx)}`,
			type: "number",
			minimum: 0,
			default: defaults.rx,
		});
	}

	for (const source of STYLE_PROP_SOURCES) {
		if (!features[source.feature]) {
			continue;
		}
		const sharedDef = handwrittenDefs[source.styleDef];
		const sharedProps = sharedDef.properties as Record<string, JsonSchemaNode>;
		for (const prop of source.props) {
			const sharedNode = sharedProps[prop];
			const defaultValue = defaults[prop];
			const generatedNode =
				defaultValue !== undefined && defaultValue !== sharedNode.default
					? buildDefaultOverrideNode(sharedNode, defaultValue)
					: { $ref: `#/$defs/${source.styleDef}/properties/${prop}` };
			properties[prop] = withOverride(prop, generatedNode);
		}
	}

	if (unappliedOverrideNames.size > 0) {
		throw new Error(
			`型 "${type}" の propertyOverrides に適用先の無いプロパティがあります: ${[...unappliedOverrideNames].join(", ")}`,
		);
	}

	const required =
		features.geometry === "rect"
			? ["id", "type", "x", "y", "width", "height"]
			: ["id", "type", "cx", "cy", "rx", "ry"];

	return {
		description,
		type: "object",
		required,
		additionalProperties: false,
		properties,
	};
}

const UNION_COMMENT =
	'Branches are tagged by the "type" field; each branch pins it with a const, which is what selects the matching branch.';

/**
 * Assemble and return the whole jiscribe.schema.json: shape $defs are generated
 * from features, while the special types, shared styles, and connector cluster
 * come verbatim from the handwritten templates. The unions and OwnerRef's
 * connectable enumeration are derived from the manifest.
 */
export function generateSchema(
	manifest: ReadonlyMap<CanonicalType, ObjectDocDefinition>,
): JsonSchemaNode {
	const defs: Record<string, JsonSchemaNode> = {};

	defs.AnyObjectDoc = {
		description:
			"Any placeable object at the top level of 'root'. Connectors are allowed here.",
		oneOf: CANONICAL_TYPE_ORDER.map((type) => ({
			$ref: `#/$defs/${docDefName(type)}`,
		})),
		$comment: UNION_COMMENT,
	};
	defs.GroupChildDoc = {
		description:
			"Objects allowed inside a group's children. Connectors are top-level only (root), so they are excluded here.",
		oneOf: CANONICAL_TYPE_ORDER.filter((type) => type !== "connector").map(
			(type) => ({ $ref: `#/$defs/${docDefName(type)}` }),
		),
		$comment: UNION_COMMENT,
	};

	for (const type of CANONICAL_TYPE_ORDER) {
		const defName = docDefName(type);
		if (TEMPLATE_DEF_TYPES.has(type)) {
			defs[defName] = handwrittenDefs[defName];
			continue;
		}
		defs[defName] = buildShapeDef(type, manifest.get(type)!);
	}

	const connectables = CANONICAL_TYPE_ORDER.filter(
		(type) => manifest.get(type)!.features.connectable,
	);
	const nonConnectables = CANONICAL_TYPE_ORDER.filter(
		(type) => !manifest.get(type)!.features.connectable,
	);
	const endpointDefNames = [
		"EndpointRef",
		"OwnedEndpointRef",
		"FreeEndpointRef",
		"OwnerRef",
		"CenterAnchorSpec",
		"ConnectPointAnchorSpec",
		"EdgeAnchorSpec",
		"FreeAnchorSpec",
		"ConnectPointId",
		"Point",
	];
	for (const defName of endpointDefNames) {
		defs[defName] = handwrittenDefs[defName];
	}
	defs.OwnerRef = {
		...handwrittenDefs.OwnerRef,
		description: `Reference to an object on the canvas by ID. The referenced object must be connectable: ${connectables.join(" / ")} (NOT ${nonConnectables.join(" / ")}).`,
	};

	const commonDefNames = [
		"MetaDoc",
		"StrokeStyle",
		"FillStyle",
		"TextStyle",
		"TransformStyle",
		"StrokeDashType",
		"TextAlign",
		"VerticalAlign",
		"ArrowType",
	];
	for (const defName of commonDefNames) {
		defs[defName] = handwrittenDefs[defName];
	}

	return {
		...rootTemplate,
		$comment:
			"GENERATED FILE — shape $defs and unions are generated from the shape manifest by `pnpm generate:ai` (packages/ai-docs). Edit shape descriptions in the ObjectDocDefinition entries, and the handwritten parts under packages/ai-docs/generator/templates/.",
		$defs: defs,
	};
}
