import { readFileSync } from "node:fs";

import {
	FILL_STYLE_KEYS,
	STROKE_STYLE_KEYS,
	TEXT_SLOT_STYLE_KEYS,
	TRANSFORM_STYLE_KEYS,
	type ObjectDocDefinition,
} from "@jiscribe/canvas/doc";
import { COMMON_ICON_GROUPS } from "@jiscribe/plugin-lucide-icon-shape/doc";

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

/**
 * Names a template description can ask for rather than spell out, so a list that also
 * exists in code is written once. `{{TOKEN}}` is replaced wherever it appears in a
 * description; a token with no entry here is left alone and shows up in the output, which
 * is louder than silently emitting nothing.
 */
const DESCRIPTION_TOKENS: Readonly<Record<string, string>> = {
	COMMON_ICON_GROUPS: COMMON_ICON_GROUPS.map(
		(group) => `${group.label}: ${group.names.join(", ")}`,
	).join("; "),
};

const expandDescriptionTokens = (node: JsonSchemaNode): JsonSchemaNode => {
	const { description } = node;
	if (typeof description !== "string") {
		return node;
	}
	return {
		...node,
		description: description.replace(
			/\{\{(\w+)\}\}/g,
			(whole, token: string) => DESCRIPTION_TOKENS[token] ?? whole,
		),
	};
};

const propertyOverrides = Object.fromEntries(
	Object.entries(
		JSON.parse(
			readFileSync(templatePath("propertyOverrides.json"), "utf8"),
		) as Record<string, Record<string, JsonSchemaNode>>,
	).map(([type, properties]) => [
		type,
		Object.fromEntries(
			Object.entries(properties).map(([name, node]) => [
				name,
				expandDescriptionTokens(node),
			]),
		),
	]),
) as Record<string, Record<string, JsonSchemaNode>>;

const rootTemplate = JSON.parse(
	readFileSync(templatePath("rootTemplate.json"), "utf8"),
) as JsonSchemaNode;

/**
 * Feature flag → the shared style $def properties it pulls in (as $ref targets).
 *
 * The names come from the canvas's own key constants rather than being spelled again
 * here, so a field added to a style group reaches the generated schema without this
 * being edited. Their order is the order the properties appear in the output.
 *
 * The radius and arrow groups are absent because they are not shared this way: `rx`
 * and the arrowheads are written into the defs that have them, a few lines below.
 */
const STYLE_PROP_SOURCES: ReadonlyArray<{
	feature: "stroke" | "fill" | "text" | "transform";
	styleDef: "StrokeStyle" | "FillStyle" | "TextStyle" | "TransformStyle";
	props: readonly string[];
}> = [
	{ feature: "stroke", styleDef: "StrokeStyle", props: STROKE_STYLE_KEYS },
	{ feature: "fill", styleDef: "FillStyle", props: FILL_STYLE_KEYS },
	{
		// The content first, then the styling of it: "text" is the body, which the slot
		// keys deliberately leave out (they are `Omit<TextSlot, "text">`).
		feature: "text",
		styleDef: "TextStyle",
		props: ["text", ...TEXT_SLOT_STYLE_KEYS],
	},
	{
		feature: "transform",
		styleDef: "TransformStyle",
		props: TRANSFORM_STYLE_KEYS,
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

const RECT_GEOMETRY_DESCRIPTIONS = {
	x: "Left-edge X coordinate of the bounding box.",
	y: "Top-edge Y coordinate of the bounding box.",
	width: "Bounding-box width in pixels.",
	height: "Bounding-box height in pixels.",
} as const;

/** Properties of the rect geometry (x/y/width/height). */
function buildRectGeometryProps(
	defaults: Readonly<Record<string, unknown>>,
): Record<string, JsonSchemaNode> {
	return {
		x: { description: RECT_GEOMETRY_DESCRIPTIONS.x, type: "number" },
		y: { description: RECT_GEOMETRY_DESCRIPTIONS.y, type: "number" },
		width: {
			description: `${RECT_GEOMETRY_DESCRIPTIONS.width} Default when created from the palette: ${formatDefaultValue(defaults.width)}`,
			type: "number",
			minimum: 0,
		},
		height: {
			description: `${RECT_GEOMETRY_DESCRIPTIONS.height} Default when created from the palette: ${formatDefaultValue(defaults.height)}`,
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

/** Properties of the point geometry (x/y only — no width/height exists to emit). */
function buildPointGeometryProps(): Record<string, JsonSchemaNode> {
	return {
		x: {
			description:
				"Left-edge X coordinate. There is no width field: the box is measured from the content and grows to the right (along the shape's own axis when rotated or flipped, so this coordinate never moves).",
			type: "number",
		},
		y: {
			description:
				"Top-edge Y coordinate. There is no height field: the box is measured from the content and grows downward (along the shape's own axis when rotated or flipped, so this coordinate never moves).",
			type: "number",
		},
	};
}

/** Geometries whose $def the generator can assemble, and the `required` list each produces. */
const GEOMETRY_REQUIRED_PROPS = {
	rect: ["id", "type", "x", "y", "width", "height"],
	ellipse: ["id", "type", "cx", "cy", "rx", "ry"],
	point: ["id", "type", "x", "y"],
} as const satisfies Readonly<Record<string, readonly string[]>>;

type GeneratableGeometry = keyof typeof GEOMETRY_REQUIRED_PROPS;

function isGeneratableGeometry(
	geometry: string,
): geometry is GeneratableGeometry {
	return geometry in GEOMETRY_REQUIRED_PROPS;
}

function buildGeometryProps(
	geometry: GeneratableGeometry,
	defaults: Readonly<Record<string, unknown>>,
): Record<string, JsonSchemaNode> {
	switch (geometry) {
		case "rect":
			return buildRectGeometryProps(defaults);
		case "ellipse":
			return buildEllipseGeometryProps(defaults);
		case "point":
			return buildPointGeometryProps();
	}
}

/** $def name of the structure the plain box shapes share through allOf. */
const BOX_SHAPE_DEF_NAME = "BoxShapeDoc";

/** Shared style properties of a $def, as $refs into the style definitions. */
function buildStyleRefProps(): Record<string, JsonSchemaNode> {
	const properties: Record<string, JsonSchemaNode> = {};
	for (const source of STYLE_PROP_SOURCES) {
		for (const prop of source.props) {
			properties[prop] = {
				$ref: `#/$defs/${source.styleDef}/properties/${prop}`,
			};
		}
	}
	return properties;
}

/** Assemble the $def every plain box shape extends (see isBoxShapeCompatible). */
function buildBoxShapeDef(): JsonSchemaNode {
	return {
		description:
			"Shared structure of the plain box shapes: rect geometry plus the Stroke / Fill / Text / Transform styles. Each concrete shape def pins `type` with a const.",
		type: "object",
		required: [...GEOMETRY_REQUIRED_PROPS.rect],
		additionalProperties: false,
		properties: {
			id: { description: "Unique identifier.", type: "string" },
			// No description here: the JSON language service surfaces the first
			// description it meets walking allOf, so one on the base would mask the
			// per-shape `Must be "..."` hover of the thin defs.
			type: { type: "string" },
			meta: { $ref: "#/$defs/MetaDoc" },
			x: { description: RECT_GEOMETRY_DESCRIPTIONS.x, type: "number" },
			y: { description: RECT_GEOMETRY_DESCRIPTIONS.y, type: "number" },
			width: {
				description: RECT_GEOMETRY_DESCRIPTIONS.width,
				type: "number",
				minimum: 0,
			},
			height: {
				description: RECT_GEOMETRY_DESCRIPTIONS.height,
				type: "number",
				minimum: 0,
			},
			...buildStyleRefProps(),
		},
	};
}

/**
 * Does this type's $def reduce to BoxShapeDoc plus its own `type` const? True
 * only when the full assembly would reproduce the shared structure exactly:
 * plain rect geometry, all four style groups enabled on their shared defaults,
 * and no handwritten property fragment.
 */
function isBoxShapeCompatible(
	type: string,
	features: ObjectDocDefinition["features"],
	defaults: Readonly<Record<string, unknown>>,
): boolean {
	if (features.geometry !== "rect" || features.radius) {
		return false;
	}
	if (Object.keys(propertyOverrides[type] ?? {}).length > 0) {
		return false;
	}
	return STYLE_PROP_SOURCES.every((source) => {
		if (!features[source.feature]) {
			return false;
		}
		const sharedProps = handwrittenDefs[source.styleDef].properties as Record<
			string,
			JsonSchemaNode
		>;
		return source.props.every((prop) => {
			const defaultValue = defaults[prop];
			return (
				defaultValue === undefined || defaultValue === sharedProps[prop].default
			);
		});
	});
}

/** The thin $def of a box-compatible type: its description plus the `type` const. */
function buildBoxShapeRefDef(
	type: string,
	description: string,
): JsonSchemaNode {
	return {
		description,
		type: "object",
		allOf: [{ $ref: `#/$defs/${BOX_SHAPE_DEF_NAME}` }],
		properties: {
			type: {
				description: `Must be "${type}".`,
				type: "string",
				const: type,
			},
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
			`Generating the $def for type "${type}" requires description and defaults`,
		);
	}
	if (!isGeneratableGeometry(features.geometry)) {
		throw new Error(
			`The $def for geometry "${features.geometry}" of type "${type}" cannot be generated mechanically (move it into a template)`,
		);
	}

	if (isBoxShapeCompatible(type, features, defaults)) {
		return buildBoxShapeRefDef(type, description);
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

	const geometryProps = buildGeometryProps(features.geometry, defaults);
	for (const [name, node] of Object.entries(geometryProps)) {
		properties[name] = withOverride(name, node);
	}

	if (features.radius) {
		if (defaults.rx === undefined) {
			throw new Error(`Type "${type}" declares radius but has no defaults.rx`);
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
			`The propertyOverrides of type "${type}" contain properties with nothing to apply to: ${[...unappliedOverrideNames].join(", ")}`,
		);
	}

	return {
		description,
		type: "object",
		required: [...GEOMETRY_REQUIRED_PROPS[features.geometry]],
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

	const sharedStructureDefNames = [
		"MetaDoc",
		"StrokeStyle",
		"FillStyle",
		"TextStyle",
		"TextRun",
		"TransformStyle",
	];
	for (const defName of sharedStructureDefNames) {
		defs[defName] = handwrittenDefs[defName];
	}
	defs[BOX_SHAPE_DEF_NAME] = buildBoxShapeDef();

	const enumDefNames = [
		"StrokeDashType",
		"TextAlign",
		"VerticalAlign",
		"ArrowType",
	];
	for (const defName of enumDefNames) {
		defs[defName] = handwrittenDefs[defName];
	}

	return {
		...rootTemplate,
		$comment:
			"GENERATED FILE — shape $defs and unions are generated from the shape manifest by `pnpm generate:ai` (packages/ai-docs). Edit shape descriptions in the ObjectDocDefinition entries, and the handwritten parts under packages/ai-docs/generator/templates/.",
		$defs: defs,
	};
}
