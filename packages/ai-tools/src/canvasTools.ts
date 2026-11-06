// The declaration of every canvas tool an AI can call: its name, the wording the
// model reads, the argument schema, how validated arguments become an
// {@link AiCanvasOp}, and which canvas API ends up driven (see canvasApiRef.ts).
//
// Nothing here knows how the tools reach a model. Wrapping a descriptor for the
// Claude Agent SDK, or turning it into a `{ name, description, input_schema }`
// entry for the Messages API, is the host's job — which is why zod is the source
// of truth: `z.toJSONSchema(z.object(inputSchema))` derives the JSON Schema, and
// there is no way back.

import {
	inlineTextStyleSchema,
	textMatchSchema,
	textSlotStyleSchema,
} from "@jiscribe/ai-tools-sdk";
import {
	ARROW_SCALE_MAX,
	ARROW_SCALE_MIN,
	DEFAULT_ARROW_SCALE,
	ArrowTypes,
	ConnectorRoutings,
	ConnectPointIds,
	OPACITY_MAX,
	OPACITY_MIN,
	TextLayouts,
	LAYERED_LAYOUT_DEFAULTS,
	LayoutDirections,
} from "@jiscribe/doc";
import { z } from "zod";

import type { CanvasApiRef } from "./canvasApiRef";
import { MAX_CAPTURE_PIXEL_SIZE, MAX_DESCRIBE_CHARS } from "./canvasOps";
import type {
	AiAlignEdge,
	AiCanvasOp,
	AiDistributeAxis,
	AiHeightMode,
	AiZOrderPlacement,
} from "./canvasOps";
import type { AiCanvasCapabilities } from "./capabilities";

/**
 * Arguments handed to {@link CanvasToolDescriptor.toOp}: one tool call's input
 * after `inputSchema` has validated it. Erased to a bag of unknowns because a
 * single array holds descriptors whose schemas all differ
 */
export type CanvasToolArgs = Record<string, unknown>;

/** One canvas tool as the model sees it, independent of how it is transported */
export type CanvasToolDescriptor = {
	/** Tool name shown to the model; unique within one descriptor set */
	name: string;
	/** The description the model reads to decide when to call this tool */
	description: string;
	/**
	 * The argument schema as a zod raw shape (the properties, not a z.object).
	 * Every object nested in it is closed with `.strict()`, so a name the tool does
	 * not have is refused rather than dropped; closing the top level falls to the
	 * host, which alone knows the arguments it adds of its own
	 */
	inputSchema: z.ZodRawShape;
	/** Turns validated arguments into the operation to run */
	toOp: (args: CanvasToolArgs) => AiCanvasOp;
	/** True when the tool only reads (describe_canvas / capture_canvas) */
	isReadOnly: boolean;
	/**
	 * The canvas API this tool drives. A tool that combines several calls names
	 * every one of them, including the ones only some arguments reach
	 */
	drives: readonly CanvasApiRef[];
};

/**
 * Declares one tool, inferring the argument type of `toOp` from `inputSchema` so
 * the body is written against the real shape.
 *
 * @param name - Tool name shown to the model
 * @param description - The wording the model reads
 * @param inputSchema - The argument properties; `{}` for a tool that takes none
 * @param toOp - Builds the operation from arguments typed by `inputSchema`
 * @param options - Required for the sake of `drives`, which every tool must state
 *   (see {@link CanvasToolDescriptor.drives}); `isReadOnly` defaults to false,
 *   i.e. the tool changes something
 */
const defineCanvasTool = <Shape extends z.ZodRawShape>(
	name: string,
	description: string,
	inputSchema: Shape,
	toOp: (args: z.output<z.ZodObject<Shape>>) => AiCanvasOp,
	options: { drives: readonly CanvasApiRef[]; isReadOnly?: boolean },
): CanvasToolDescriptor => ({
	name,
	description,
	inputSchema,
	// The one place the per-tool argument type is erased, so that descriptors with
	// different schemas fit in one array. Everything the caller sees is still typed:
	// toOp was written against Shape, and the host only ever calls it with what
	// inputSchema validated.
	toOp: toOp as (args: CanvasToolArgs) => AiCanvasOp,
	isReadOnly: options.isReadOnly ?? false,
	drives: options.drives,
});

/**
 * What an anchor argument may name, said once for all four connector anchors. The
 * edge anchors of AnchorHandleId (`{ side, t }`) are not offered to the AI.
 */
const ANCHOR_ID_NOTE = `"center" or an edge midpoint (${ConnectPointIds.join(" / ")}) on any connectable object; a type may add points of its own, checked against the object (an erEntity's "col:<index>:left" / "col:<index>:right").`;

/** One anchor argument: an open set of ids, since a type may declare its own. */
const anchorIdSchema = (purpose: string) =>
	z.string().min(1).optional().describe(`${purpose} ${ANCHOR_ID_NOTE}`);

const ALIGN_EDGES = [
	"left",
	"centerX",
	"right",
	"top",
	"centerY",
	"bottom",
] as const satisfies readonly AiAlignEdge[];

const DISTRIBUTE_AXES = [
	"horizontal",
	"vertical",
] as const satisfies readonly AiDistributeAxis[];

const Z_ORDER_PLACEMENTS = [
	"front",
	"back",
	"forward",
	"backward",
] as const satisfies readonly AiZOrderPlacement[];

const HEIGHT_MODES = [
	"auto",
	"fixed",
] as const satisfies readonly AiHeightMode[];

/** Which shapes can follow their text's height; autoHeight and set_height_mode share it. */
const AUTO_HEIGHT_TYPES_NOTE =
	"Only box shapes holding one body of text inside their box (rect and the like; not ellipse, a shape labelled outside its outline, markdown or container)";

/** How the arrowheads' size is stated; set_style, connect_many and update_connectors share it. */
const arrowScaleSchema = z
	.number()
	.min(ARROW_SCALE_MIN)
	.max(ARROW_SCALE_MAX)
	.optional()
	.describe(
		`Factor on both arrowheads' size, which follows strokeWidth; ${DEFAULT_ARROW_SCALE} when omitted.`,
	);

/**
 * The shared style vocabulary; add_objects and set_style speak the same one. The
 * typography is the one plugin tools styling text slots declare too (textSlotStyleSchema).
 * Properties a type has no place for (fill on a connector, an arrowhead on a rect,
 * a font colour on a shape without text) are dropped by docOps, which says so in the
 * tool result.
 */
const styleSchema = {
	fill: z
		.string()
		.optional()
		.describe(
			"Background color, any CSS color; an alpha in it (rgba(), #RRGGBBAA) or fillOpacity makes it semi-transparent. On a connector it colors the label.",
		),
	fillOpacity: z
		.number()
		.min(OPACITY_MIN)
		.max(OPACITY_MAX)
		.optional()
		.describe(
			"Background opacity, 1 (the default) opaque, multiplied into the fill color's own alpha. A connector has none.",
		),
	stroke: z
		.string()
		.optional()
		.describe(
			"Outline color, any CSS color, semi-transparent through its alpha or strokeOpacity. On a connector, the line's color.",
		),
	strokeWidth: z.number().min(0).optional().describe("Outline width in px."),
	strokeDashType: z
		.enum(["solid", "dashed", "dotted"])
		.optional()
		.describe("Outline dash pattern."),
	strokeOpacity: z
		.number()
		.min(OPACITY_MIN)
		.max(OPACITY_MAX)
		.optional()
		.describe(
			"Outline opacity, 1 (the default) opaque, multiplied into the stroke color's own alpha. On a connector it fades the line.",
		),
	startArrow: z
		.enum(ArrowTypes)
		.optional()
		.describe("Arrowhead at the line's start; polyline and connector only."),
	endArrow: z
		.enum(ArrowTypes)
		.optional()
		.describe("Arrowhead at the line's end; polyline and connector only."),
	arrowScale: arrowScaleSchema.describe(
		`${arrowScaleSchema.description} Polyline and connector only.`,
	),
	rx: z.number().min(0).optional().describe("Corner radius in px; rect only."),
	labelFill: z
		.string()
		.optional()
		.describe(
			'Color behind the label of a shape whose text sits below its box (actor, server, the icon sets, …); no other type takes it (a connector\'s label uses fill). Default "auto" paints the page\'s color, hiding connectors under the label; "transparent" shows them.',
		),
	...textSlotStyleSchema,
};

const pointSchema = z
	.object({
		x: z.number().describe("World x in px."),
		y: z.number().describe("World y in px."),
	})
	.strict();

/**
 * Which named text an argument picks; get_text, set_texts, measure_text and
 * set_text_styles share it.
 *
 * @param extraNote - Appended after the shared wording; "" for none
 */
const textSlotArgSchema = (extraNote: string) =>
	z
		.string()
		.optional()
		.describe(
			`Named text slot, for a type keeping several (record: "name" / "attributes" / "operations"; list_types names each type's); omit for the single body of text.${extraNote}`,
		);

/**
 * Which characters to decorate (textMatchSchema), plus which of an object's named
 * texts holds them.
 */
const textStretchSchema = {
	...textMatchSchema,
	slot: textSlotArgSchema(""),
};

/** Why labelPosition / labelOffset can be refused; said the same on both. */
const LABEL_REQUIRED_NOTE =
	"Refused when the connector has no label (give label too when drawing one).";

/** Where a connector's label sits; drawing and changing a connector share it. */
const labelPlacementSchema = {
	labelPosition: z
		.number()
		.min(0)
		.max(1)
		.optional()
		.describe(
			`Where the label sits along the line, 0 at the source to 1 at the target. ${LABEL_REQUIRED_NOTE}`,
		),
	labelOffset: z
		.number()
		.optional()
		.describe(
			`The label's distance off the line in px; the sign picks the side. ${LABEL_REQUIRED_NOTE}`,
		),
};

/** What a connector's points are; drawing and changing a connector share it. */
const CONNECTOR_POINTS_NOTE =
	'Corners between the endpoints, source → target, any number; with routing "straight" the line runs exactly through them.';

/** The endpoints and options one connector is drawn with: one connect_many entry. */
const connectorDrawSchema = {
	sourceId: z
		.string()
		.optional()
		.describe("id of the source object; or sourcePoint for an unattached end."),
	targetId: z
		.string()
		.optional()
		.describe("id of the target object; or targetPoint for an unattached end."),
	sourcePoint: pointSchema
		.optional()
		.describe(
			"World point for an unattached source end; not with sourceId or sourceAnchor, and the target end must then be attached.",
		),
	targetPoint: pointSchema
		.optional()
		.describe(
			"World point for an unattached target end; not with targetId or targetAnchor, and the source end must then be attached.",
		),
	sourceAnchor: anchorIdSchema("Anchor on the source, center by default."),
	targetAnchor: anchorIdSchema("Anchor on the target, center by default."),
	startArrow: z
		.enum(ArrowTypes)
		.optional()
		.describe("Arrowhead at the source end."),
	endArrow: z
		.enum(ArrowTypes)
		.optional()
		.describe("Arrowhead at the target end."),
	arrowScale: arrowScaleSchema,
	label: z
		.string()
		.optional()
		.describe("Text drawn on the line, in place of a text shape beside it."),
	...labelPlacementSchema,
	routing: z
		.enum(ConnectorRoutings)
		.optional()
		.describe("Line shape; omit to derive it from the anchors."),
	points: z
		.array(pointSchema)
		.optional()
		.describe(`${CONNECTOR_POINTS_NOTE} Omit to let the engine route it.`),
};

/** The changes one existing connector takes: one update_connectors entry. */
const connectorChangeSchema = {
	sourceId: z
		.string()
		.optional()
		.describe("Re-attach the source end to this object."),
	targetId: z
		.string()
		.optional()
		.describe("Re-attach the target end to this object."),
	sourcePoint: pointSchema
		.optional()
		.describe(
			"Detach the source end onto this world point; not with sourceId or sourceAnchor, and refused when both ends would be unattached.",
		),
	targetPoint: pointSchema
		.optional()
		.describe(
			"Detach the target end onto this world point; not with targetId or targetAnchor, and refused when both ends would be unattached.",
		),
	sourceAnchor: anchorIdSchema("Move the source end to this anchor."),
	targetAnchor: anchorIdSchema("Move the target end to this anchor."),
	startArrow: z
		.enum(ArrowTypes)
		.optional()
		.describe('Arrowhead at the source end; "None" removes it.'),
	endArrow: z
		.enum(ArrowTypes)
		.optional()
		.describe('Arrowhead at the target end; "None" removes it.'),
	arrowScale: arrowScaleSchema,
	routing: z.enum(ConnectorRoutings).optional().describe("Line shape."),
	points: z
		.array(pointSchema)
		.optional()
		.describe(
			`${CONNECTOR_POINTS_NOTE} [] hands the route back to the engine.`,
		),
	...labelPlacementSchema,
};

const rectSchema = z
	.object({
		x: z.number().describe("Top-left x in px."),
		y: z.number().describe("Top-left y in px."),
		width: z.number().min(0).describe("Width in px."),
		height: z.number().min(0).describe("Height in px."),
	})
	.strict();

/** The region a screen tool works on (AiRegionArgs); capture_canvas and fit_view share it, so its wording has to read right from both */
const regionSchema = {
	target: z
		.enum(["all", "selection"])
		.optional()
		.describe(
			'The whole drawing ("all") or the current selection; exclusive with ids and rect.',
		),
	ids: z
		.array(z.string())
		.min(1)
		.optional()
		.describe(
			"Objects to take, as the union of what they draw, decoration included; exclusive with target and rect.",
		),
	rect: rectSchema
		.optional()
		.describe(
			"A world rect, taken exactly as given; exclusive with target and ids.",
		),
};

/**
 * Declares the whole canvas tool set.
 *
 * The type list reaches the host at session start, so the descriptors are rebuilt
 * every time. Without it the type falls back to a free string, and a wrong type
 * surfaces as the docOps error carried back in the tool result.
 *
 * @param capabilities - The shape types to name in the schemas. null means "not
 *   received yet", which makes the add_objects type a free string instead of an enum
 * @returns The descriptors in the order the model sees them; read-only tools first
 */
export const createCanvasToolDescriptors = (
	capabilities: AiCanvasCapabilities | null,
): readonly CanvasToolDescriptor[] => {
	const creatableTypes = capabilities?.creatableObjectTypes ?? [];
	const [firstType, ...restTypes] = creatableTypes;

	const describeCanvasTool = defineCanvasTool(
		"describe_canvas",
		[
			"Read the whole document as CanvasDoc JSON: its meta and settings, then every object's id, type, geometry and style.",
			`The result is cut off past ${MAX_DESCRIBE_CHARS.toLocaleString("en-US")} characters (some 50 objects), and the rest is out of reach here: on a larger drawing use list_objects, find_objects and get_object.`,
		].join(" "),
		{},
		() => ({ kind: "describeCanvas" }),
		// The host serializes the document it already holds; no doc-ops read is involved
		{ isReadOnly: true, drives: ["agent"] },
	);

	const listObjectsTool = defineCanvasTool(
		"list_objects",
		[
			"Map the whole canvas: one summary per object (id, type, bounding box, holding group, text), back to front, each group followed by what it holds.",
			"A connector or an empty group has a null box. A very large drawing is cut off, and the result says so; narrow it with find_objects.",
		].join(" "),
		{},
		() => ({ kind: "listObjects" }),
		{ isReadOnly: true, drives: ["docOps.listObjects"] },
	);

	const findObjectsTool = defineCanvasTool(
		"find_objects",
		[
			"Search the canvas by type, text, an enclosing rect or the holding group, returning list_objects summaries of the matches.",
			"Every condition given must hold, and an object that cannot answer one fails it. An empty result means nothing matches; no condition at all is list_objects.",
		].join(" "),
		{
			type: z
				.union([z.string(), z.array(z.string()).min(1)])
				.optional()
				.describe(
					'Types to keep, one name or several ("rect", ["rect", "ellipse"]), as list_types names them.',
				),
			text: z
				.string()
				.optional()
				.describe(
					"Keep objects whose text contains this, case-insensitively, matched against what get_text returns.",
				),
			within: rectSchema
				.optional()
				.describe(
					"Keep objects whose bounding box lies entirely inside this rect, edges included; one straddling the edge, or with no box, never matches.",
				),
			inGroup: z
				.string()
				.optional()
				.describe(
					"Keep this group's direct children only, not a nested group's. Fails when the id is not a group.",
				),
		},
		(args) => ({ kind: "findObjects", ...args }),
		{ isReadOnly: true, drives: ["docOps.findObjects"] },
	);

	const getObjectTool = defineCanvasTool(
		"get_object",
		[
			"Read one object in full as JSON: every field its type declares, a connector's ends and route included.",
			"Fails when no object has the id.",
		].join(" "),
		{
			id: z.string().describe("id of the object to read; groups included."),
		},
		(args) => ({ kind: "getObject", ...args }),
		{ isReadOnly: true, drives: ["docOps.getObject"] },
	);

	const getObjectBoundsTool = defineCanvasTool(
		"get_object_bounds",
		[
			"Measure the box one object occupies in world coordinates, in the top-left form add_objects and set_positions take; rotation is ignored.",
			"A group is measured from what it holds; a connector or an empty group says it has no box rather than failing. For what is drawn, decoration included, use measure_visual_bounds.",
		].join(" "),
		{
			id: z.string().describe("id of the object to measure."),
		},
		(args) => ({ kind: "getObjectBounds", ...args }),
		{ isReadOnly: true, drives: ["docOps.getObjectBounds"] },
	);

	const getCombinedBoundsTool = defineCanvasTool(
		"get_combined_bounds",
		[
			"Measure the box several objects occupy together, or the whole drawing when ids are omitted; rotation is ignored.",
			"Ids with no box (a connector, an empty group) are skipped, and a set with none says so rather than failing; an id not on the canvas is an error.",
		].join(" "),
		{
			ids: z
				.array(z.string())
				.min(1)
				.optional()
				.describe(
					"ids to measure together; omit for everything on the canvas.",
				),
		},
		(args) => ({ kind: "getCombinedBounds", ...args }),
		{ isReadOnly: true, drives: ["docOps.getCombinedBounds"] },
	);

	const getTextTool = defineCanvasTool(
		"get_text",
		[
			"Read one object's text as plain characters, inline styling dropped and rows joined by newlines, as set_texts takes it back.",
			"On a connector, its label. An empty text says so; a type holding no text, or an unknown slot, is an error.",
		].join(" "),
		{
			id: z.string().describe("id of the object to read the text of."),
			slot: textSlotArgSchema(""),
		},
		(args) => ({ kind: "getText", ...args }),
		{ isReadOnly: true, drives: ["docOps.getText"] },
	);

	const getZOrderTool = defineCanvasTool(
		"get_z_order",
		[
			"Read where an object stands in the stacking order: its index among its parent's children counted from the back, and how many there are.",
			"It is counted inside the parent, never across the whole canvas, as reorder_objects moves it.",
		].join(" "),
		{
			id: z.string().describe("id of the object to locate."),
		},
		(args) => ({ kind: "getZOrder", ...args }),
		{ isReadOnly: true, drives: ["docOps.getZOrder"] },
	);

	const getParentGroupTool = defineCanvasTool(
		"get_parent_group",
		"Read which group holds an object. None, at the top level, is an answer; only an id not on the canvas fails.",
		{
			id: z.string().describe("id of the object whose group is read."),
		},
		(args) => ({ kind: "getParentGroup", ...args }),
		{ isReadOnly: true, drives: ["docOps.getParentGroup"] },
	);

	const getGroupMembersTool = defineCanvasTool(
		"get_group_members",
		[
			"List what a group holds directly, back to front; a nested group is one id, read in turn.",
			"Fails when the id is not on the canvas or not a group.",
		].join(" "),
		{
			groupId: z.string().describe("id of the group to read."),
		},
		(args) => ({ kind: "getGroupMembers", ...args }),
		{ isReadOnly: true, drives: ["docOps.getGroupMembers"] },
	);

	const getConnectorsTool = defineCanvasTool(
		"get_connectors",
		[
			"List the connectors with an end on this object, in drawing order.",
			"Only ids come back: get_object gives a connector's ends and route, measure_connector_path where it is drawn. None attached is an answer, not a failure.",
		].join(" "),
		{
			id: z.string().describe("id of the object whose connectors are listed."),
		},
		(args) => ({ kind: "getConnectors", ...args }),
		{ isReadOnly: true, drives: ["docOps.getConnectors"] },
	);

	const getConnectedObjectsTool = defineCanvasTool(
		"get_connected_objects",
		[
			"List the objects at the far end of this object's connectors, each named once.",
			"The object itself and ends at a bare point are left out, and direction is not told apart (get_connectors and get_object tell it). None is an answer, not a failure.",
		].join(" "),
		{
			id: z.string().describe("id of the object to step out from."),
		},
		(args) => ({ kind: "getConnectedObjects", ...args }),
		{ isReadOnly: true, drives: ["docOps.getConnectedObjects"] },
	);

	const listTypesTool = defineCanvasTool(
		"list_types",
		[
			"List every object type the canvas knows and what each takes: whether add_objects creates it, whether connect_many can attach to it, its text (one body, named slots, or none), how its shape is stored, and the plugin tools for it.",
			'Only a poly type takes set_points_many. A type stored as a point is sized by its content (extraProps), and add_objects and resize_objects refuse it a width or height, except a text in textLayout "block", which takes the width it wraps in.',
			"Plugin tools reach what the generic ops do not on that type, such as texts kept in fields of its own. The answer is the same on an empty canvas.",
		].join(" "),
		{},
		() => ({ kind: "listTypes" }),
		{ isReadOnly: true, drives: ["docOps.listTypes"] },
	);

	// One add_objects entry: its type, then everything else the new object is made with
	const objectTypeSchema =
		firstType === undefined
			? z.string().describe("Object type to add (rect, ellipse, …).")
			: z.enum([firstType, ...restTypes]).describe("Object type to add.");

	const newObjectSchema = {
		x: z
			.number()
			.describe(
				"Top-left x of the bounding box in px; every type, ellipse included, is placed by its box (no cx / cy / rx / ry here).",
			),
		y: z.number().describe("Top-left y of the bounding box in px; +y is down."),
		width: z
			.number()
			.min(0)
			.optional()
			.describe(
				"Bounding-box width in px (an ellipse's whole width); the shape's default when omitted. Refused for a type stored as a point (list_types), which its content sizes through extraProps, except a text in textLayout \"block\", where it is the width the text wraps in.",
			),
		height: z
			.number()
			.min(0)
			.optional()
			.describe(
				"Bounding-box height in px (an ellipse's whole height); the shape's default when omitted, written into the document all the same (autoHeight leaves it out). Refused for a type stored as a point.",
			),
		autoHeight: z
			.boolean()
			.optional()
			.describe(
				`Leave the height out of the document, so the shape is as tall as its text, now and as it is edited. ${AUTO_HEIGHT_TYPES_NOTE}; refused together with height. set_height_mode switches it later.`,
			),
		textLayout: z
			.enum(TextLayouts)
			.optional()
			.describe(
				'How a text lays out; the text type only. "label" (the default) breaks only at your newlines; "block" wraps inside width, which it then requires. The height is always measured.',
			),
		text: z
			.string()
			.optional()
			.describe(
				'Label text, for a type with one body of text. A type with named slots (list_types: text "slots", as record) refuses it: use set_texts. A type keeping texts in properties of its own takes them in extraProps, and a type with no text (list_types: text null) refuses it.',
			),
		points: z
			.array(pointSchema)
			.min(2)
			.optional()
			.describe(
				"Vertices in world coordinates, in drawing order; polygon (3 or more, never repeating the first) and polyline (2 or more) only. They place and size the shape, so x / y / width / height are ignored, yet x / y are required: pass the vertices' top-left. Omitted, the type's own outline.",
			),
		rotation: z
			.number()
			.optional()
			.describe(
				"Clockwise degrees about the shape's own centre; 0 is upright. Ignored by polygon, polyline and connector, which turn by their points.",
			),
		extraProps: z
			.record(z.string(), z.unknown())
			.optional()
			.describe(
				"Properties of the type's own beyond the arguments here (lucideIcon's `icon`, say), as its schema names them. A malformed value, or an argument above repeated here, is refused with the reason.",
			),
		...styleSchema,
	};

	const addObjectsTool = defineCanvasTool(
		"add_objects",
		[
			"Add objects to the canvas, one or many per call.",
			"x / y are the top-left of each bounding box in px, +x right and +y down. An omitted width / height is the shape's own default, written into the document like any other.",
			"Style an entry only with what its type has: anything else is refused, and the error names what it takes.",
			"Created in the order given. All or nothing: the error names the failing index. Returns the new ids in order.",
		].join(" "),
		{
			objects: z
				.array(
					z.object({ type: objectTypeSchema, ...newObjectSchema }).strict(),
				)
				.min(1)
				.describe("The objects to add, in creation order."),
			groupNewObjects: z
				.boolean()
				.optional()
				.describe(
					"Wrap everything this call adds in one new group (2 objects or more); the result names its id.",
				),
			parentGroupId: z
				.string()
				.optional()
				.describe(
					"Add the objects inside this existing group instead; not with groupNewObjects.",
				),
		},
		(args) => ({ kind: "addObjects", ...args }),
		{
			drives: [
				"docOps.addObjects",
				"docOps.groupObjects",
				"docOps.addObjectsToGroup",
			],
		},
	);

	const connectManyTool = defineCanvasTool(
		"connect_many",
		[
			'Join objects with connectors, many per call. Both anchors "center" give a straight line; edge anchors give an orthogonal route that keeps off shapes.',
			'routing "straight" with points draws a free path through those corners. One end may be a bare point (sourcePoint / targetPoint), never both — that is a polyline.',
			"Ends must already exist, so add objects in an earlier call; list_types says which types take an end. All or nothing: the error names the failing entry. Returns the connector ids in order; re-route with update_connectors.",
		].join(" "),
		{
			entries: z
				.array(z.object(connectorDrawSchema).strict())
				.min(1)
				.describe("The connectors to draw, in drawing order."),
		},
		(args) => ({ kind: "connectMany", ...args }),
		{ drives: ["docOps.connectMany"] },
	);

	const deleteObjectsTool = defineCanvasTool(
		"delete_objects",
		"Delete objects by id; the connectors attached to them and a group's children go with them.",
		{
			ids: z.array(z.string()).min(1).describe("ids to delete."),
		},
		(args) => ({ kind: "deleteObjects", ...args }),
		{ drives: ["docOps.deleteObjects"] },
	);

	const setPositionsTool = defineCanvasTool(
		"set_positions",
		[
			"Move objects so each bounding box starts at a top-left of its own, many per call.",
			"An omitted axis stays as it is, and attached connectors follow. To shift a set by one delta, use translate_objects. All or nothing: the error names the failing entry.",
		].join(" "),
		{
			entries: z
				.array(
					z
						.object({
							id: z.string().describe("id of the object to move."),
							x: z.number().optional().describe("New top-left x in px."),
							y: z.number().optional().describe("New top-left y in px."),
						})
						.strict(),
				)
				.min(1)
				.describe("One entry per object."),
		},
		(args) => ({ kind: "setPositions", ...args }),
		{ drives: ["docOps.setPositions"] },
	);

	const translateObjectsTool = defineCanvasTool(
		"translate_objects",
		"Shift objects by the same delta, keeping the layout between them.",
		{
			ids: z.array(z.string()).min(1).describe("ids to shift."),
			deltaX: z.number().describe("Px to move right; negative moves left."),
			deltaY: z.number().describe("Px to move down; negative moves up."),
		},
		(args) => ({ kind: "translateObjects", ...args }),
		{ drives: ["docOps.translateObjects"] },
	);

	const resizeObjectsTool = defineCanvasTool(
		"resize_objects",
		[
			"Resize objects, each to a size of its own and keeping its top-left corner, many per call. An omitted axis keeps its extent.",
			"A group scales its children, so a group and an object inside it cannot share a call.",
			'A connector or an empty group is refused, and so is a type stored as a point (set_extra_props changes what sizes it), except a text in textLayout "block", which takes a width (the one it wraps in) and never a height.',
			"Each id once. All or nothing: the error names the failing entry.",
		].join(" "),
		{
			entries: z
				.array(
					z
						.object({
							id: z.string().describe("id of the object to resize."),
							width: z
								.number()
								.min(1)
								.optional()
								.describe("New width in px; omit to keep it."),
							height: z
								.number()
								.min(1)
								.optional()
								.describe("New height in px; omit to keep it."),
						})
						.strict(),
				)
				.min(1)
				.describe("One entry per object."),
		},
		(args) => ({ kind: "resizeObjects", ...args }),
		{ drives: ["docOps.resizeObjects"] },
	);

	const setHeightModeTool = defineCanvasTool(
		"set_height_mode",
		[
			'Switch objects between a stated height ("fixed") and one following their text ("auto": as tall as the wrapped text, now and as it is edited).',
			`${AUTO_HEIGHT_TYPES_NOTE} take this; any other is refused. All or nothing.`,
		].join(" "),
		{
			ids: z.array(z.string()).min(1).describe("ids to switch."),
			mode: z
				.enum(HEIGHT_MODES)
				.describe('"auto" follows the text; "fixed" states height.'),
			height: z
				.number()
				.positive()
				.optional()
				.describe(
					'New height in px; required by "fixed" (refused without), unread by "auto".',
				),
		},
		(args) => ({ kind: "setHeightMode", ...args }),
		{ drives: ["docOps.setHeightMode"] },
	);

	const setRotationTool = defineCanvasTool(
		"set_rotation",
		[
			"Turn objects to an absolute angle, clockwise degrees about each one's own centre; 0 stands it upright.",
			"Polygons, polylines and connectors do not turn: they are skipped, and the result names them.",
		].join(" "),
		{
			ids: z.array(z.string()).min(1).describe("ids to turn."),
			rotation: z
				.number()
				.describe("Clockwise degrees; -90 and 270 are the same angle."),
		},
		(args) => ({ kind: "setRotation", ...args }),
		{ drives: ["docOps.setRotation"] },
	);

	const setPointsManyTool = defineCanvasTool(
		"set_points_many",
		[
			"Replace the whole vertex list of polygons and polylines, many per call; it is how they move, resize and reshape.",
			"World coordinates in drawing order. A polygon closes itself, so never repeat the first vertex; it needs 3, a polyline 2.",
			"A connector's points are its route: update_connectors. All or nothing: the error names the failing entry.",
		].join(" "),
		{
			entries: z
				.array(
					z
						.object({
							id: z.string().describe("id of the polygon or polyline."),
							points: z
								.array(pointSchema)
								.min(2)
								.describe("The whole new outline, in drawing order."),
						})
						.strict(),
				)
				.min(1)
				.describe("One outline per shape."),
		},
		(args) => ({ kind: "setPointsMany", ...args }),
		{ drives: ["docOps.setPointsMany"] },
	);

	const reorderObjectsTool = defineCanvasTool(
		"reorder_objects",
		[
			"Restack objects inside the parent holding them; objects moved together keep their order relative to each other.",
			"Creation order is drawing order, the last added on top.",
		].join(" "),
		{
			ids: z
				.array(z.string())
				.min(1)
				.describe("ids to restack; their order here means nothing."),
			placement: z
				.enum(Z_ORDER_PLACEMENTS)
				.describe(
					'"front" / "back" go the whole way; "forward" / "backward" step past the nearest object not itself moving.',
				),
		},
		(args) => ({ kind: "reorderObjects", ...args }),
		{ drives: ["docOps.reorderObjects"] },
	);

	const setStyleTool = defineCanvasTool(
		"set_style",
		"Restyle existing objects, several ids per call. Properties a type has no place for are skipped, and the result names them.",
		{
			ids: z.array(z.string()).min(1).describe("ids to restyle."),
			...styleSchema,
		},
		({ ids, ...style }) => ({ kind: "setStyle", ids, style }),
		{ drives: ["docOps.setStyle"] },
	);

	const setBackgroundTool = defineCanvasTool(
		"set_background",
		[
			"Paint the canvas surface behind every shape.",
			"Pass a literal CSS color, never var(...): hosts without your theme read the file. null removes it, handing the surface back to the host's theme, which is not the same as white.",
		].join(" "),
		{
			color: z
				.string()
				.nullable()
				.describe(
					'A literal CSS color ("#fafafa", "transparent"), or null to follow the host theme.',
				),
		},
		({ color }) => ({ kind: "setBackground", color }),
		{ drives: ["docOps.setBackground"] },
	);

	const setDocumentViewTool = defineCanvasTool(
		"set_document_view",
		[
			"Declare how the document opens: the padding kept around the drawing (also exported images' margin), the framing on open, and whether panning stops at the page.",
			"Pass only the parts to change; null stops declaring a part, handing it back to the host (not the same as zero). Editing is not constrained, and a host's own camera or scroll limit outranks this.",
			"It writes the document, not the screen: set_view and fit_view move the camera now.",
		].join(" "),
		{
			padding: z
				.object({
					top: z
						.number()
						.min(0)
						.optional()
						.describe("Space above the content, in world px."),
					right: z
						.number()
						.min(0)
						.optional()
						.describe("Space right of the content, in world px."),
					bottom: z
						.number()
						.min(0)
						.optional()
						.describe("Space below the content, in world px."),
					left: z
						.number()
						.min(0)
						.optional()
						.describe("Space left of the content, in world px."),
				})
				.nullable()
				.optional()
				.describe(
					"Empty space outside the drawing; a side left out is 0, and the sides given replace the whole padding. null declares none.",
				),
			open: z
				.enum(["fit-width", "fit-all"])
				.nullable()
				.optional()
				.describe(
					'"fit-width" fits the width from the top; "fit-all" fits and centers the whole drawing. null leaves it to the host.',
				),
			scroll: z
				.enum(["content", "infinite"])
				.nullable()
				.optional()
				.describe(
					'"content" walls panning in at the padded content; "infinite" is the endless board, as is null, which stops declaring it.',
				),
		},
		({ padding, open, scroll }) => ({
			kind: "setDocumentView",
			...(padding === undefined ? {} : { padding }),
			...(open === undefined ? {} : { open }),
			...(scroll === undefined ? {} : { scroll }),
		}),
		{ drives: ["docOps.setView"] },
	);

	const setMetaTool = defineCanvasTool(
		"set_meta",
		[
			"Set the `meta` name and description of the document (no id) or of one object, groups and connectors included.",
			"The document's name is the title an exported SVG carries. Nothing is drawn from either, so it is no visible label.",
			"A field left out is kept, null drops it, and other meta members are kept.",
		].join(" "),
		{
			id: z
				.string()
				.optional()
				.describe("id of the object to write; omit for the document's own."),
			name: z
				.string()
				.nullable()
				.optional()
				.describe("The name; null drops it."),
			description: z
				.string()
				.nullable()
				.optional()
				.describe("What it is about, several lines allowed; null drops it."),
		},
		({ id, name, description }) => ({
			kind: "setMeta",
			...(id === undefined ? {} : { id }),
			...(name === undefined ? {} : { name }),
			...(description === undefined ? {} : { description }),
		}),
		{ drives: ["docOps.setMeta"] },
	);

	const setExtraPropsTool = defineCanvasTool(
		"set_extra_props",
		[
			"Set one object's properties belonging to its type (lucideIcon's `icon`, say), as the type's schema names them.",
			"Unlike set_style nothing is skipped: an unknown name or a rejected value is an error, and the object is left as it was.",
			'It also moves an existing text between layouts: `textLayout` and the `width` a "block" wraps in, always together; a `width` on a text not being a block is refused.',
			'`textVerticalBasis` places the label in the area the outline leaves clear ("region") or on the whole height ("frame"). Only a type whose label area is shorter than the shape (a cylinder\'s caps, a header band) takes it, and its schema lists it; any other type refuses it.',
		].join(" "),
		{
			id: z.string().describe("id of the object to change."),
			extraProps: z
				.record(z.string(), z.unknown())
				.describe(
					"Names and values to set; only names the type declares (geometry, text and style have their own tools).",
				),
		},
		({ id, extraProps }) => ({ kind: "setExtraProps", id, extraProps }),
		{ drives: ["docOps.setExtraProps"] },
	);

	const setTextsTool = defineCanvasTool(
		"set_texts",
		[
			"Rewrite the text of objects, many per call.",
			'On a connector it is the text on the line, and "" removes it. All or nothing: the error names the failing entry.',
		].join(" "),
		{
			entries: z
				.array(
					z
						.object({
							id: z.string().describe("id of the object to retext."),
							text: z.string().describe('The new text; "" clears it.'),
							slot: textSlotArgSchema(" It must already exist."),
						})
						.strict(),
				)
				.min(1)
				.describe("One text per object, written in order."),
		},
		(args) => ({ kind: "setTexts", ...args }),
		{ drives: ["docOps.setTexts"] },
	);

	const setTextStylesTool = defineCanvasTool(
		"set_text_styles",
		[
			"Decorate part of an object's text, such as a few words in bold, leaving the rest as it was; many stretches per call.",
			"set_style styles the whole text, and applied later it overrides this.",
			"A stretch is named by its characters (match), never an offset; occurrence picks one, and omitted every occurrence is decorated. Repeat an id for several stretches; they stack in the order given.",
			"An entry fails when match does not occur, and on text styled only as a whole (a connector label, a slot of rows, a markdown body): use set_style there. All or nothing: the error names the failing entry.",
		].join(" "),
		{
			entries: z
				.array(
					z
						.object({
							id: z.string().describe("id of the object."),
							...textStretchSchema,
							...inlineTextStyleSchema,
						})
						.strict(),
				)
				.min(1)
				.describe("One stretch per entry, decorated in order."),
		},
		(args) => ({ kind: "setTextStyles", ...args }),
		{ drives: ["docOps.setInlineTextStyles"] },
	);

	const updateConnectorsTool = defineCanvasTool(
		"update_connectors",
		[
			"Change existing connectors, many per call: where each end attaches, the route, arrowheads and label placement.",
			"An end may move to a bare point (sourcePoint / targetPoint) while the other stays attached. A non-empty points list is the path, routed around nothing; [] hands it back to the engine.",
			"Each id once, every change to it in one entry. All or nothing: the error names the failing entry.",
		].join(" "),
		{
			entries: z
				.array(
					z
						.object({
							id: z.string().describe("id of the connector to change."),
							...connectorChangeSchema,
						})
						.strict(),
				)
				.min(1)
				.describe("One entry per connector."),
		},
		(args) => ({ kind: "updateConnectors", ...args }),
		{ drives: ["docOps.updateConnectors"] },
	);

	const alignObjectsTool = defineCanvasTool(
		"align_objects",
		"Line objects up on one edge or midline of the box they occupy together. Only that axis moves, and the box stays where it is.",
		{
			ids: z.array(z.string()).min(2).describe("ids to align."),
			edge: z
				.enum(ALIGN_EDGES)
				.describe(
					"Edge or midline: left / centerX / right move along x, top / centerY / bottom along y.",
				),
		},
		(args) => ({ kind: "alignObjects", ...args }),
		{ drives: ["docOps.alignObjects"] },
	);

	const distributeObjectsTool = defineCanvasTool(
		"distribute_objects",
		"Spread objects along one axis. Without spacing the outermost two stay and the gaps between are evened out (3+ objects); with spacing the first stays and every gap is that many px.",
		{
			ids: z.array(z.string()).min(2).describe("ids to spread."),
			axis: z
				.enum(DISTRIBUTE_AXES)
				.describe("Axis to spread along; the other is left alone."),
			spacing: z
				.number()
				.optional()
				.describe(
					"Gap between neighbours in px; omit to even out the space they occupy.",
				),
		},
		(args) => ({ kind: "distributeObjects", ...args }),
		{ drives: ["docOps.distributeObjects"] },
	);

	const layoutObjectsTool = defineCanvasTool(
		"layout_objects",
		[
			"Arrange objects automatically as a layered graph: connectors decide the layers (a source before its targets), each layer is ordered to cut crossings, and every connector between placed objects is re-attached to the sides that now face each other with a right-angled route around what lies between, a label given room on its line.",
			"Omit ids for the whole canvas; connectors among ids are skipped. A group or a container shape (a titled region shapes sit inside, such as a VPC boundary) keeps its members and is resized around them, and a container holds what lies inside it at the call, so name the contents with it.",
			"The top-left corner the objects occupied together is kept. An object with no connector goes in the first layer.",
		].join(" "),
		{
			ids: z
				.array(z.string())
				.min(2)
				.optional()
				.describe("ids to arrange; omit for every top-level object."),
			direction: z
				.enum(LayoutDirections)
				.optional()
				.describe(
					`Which way the flow runs: TB (top to bottom), LR (left to right), BT or RL; default ${LAYERED_LAYOUT_DEFAULTS.direction}.`,
				),
			nodeSpacing: z
				.number()
				.min(0)
				.optional()
				.describe(
					`Gap in px between neighbours of one layer; default ${LAYERED_LAYOUT_DEFAULTS.nodeSpacing}.`,
				),
			rankSpacing: z
				.number()
				.min(0)
				.optional()
				.describe(
					`Gap in px between one layer and the next; default ${LAYERED_LAYOUT_DEFAULTS.rankSpacing}.`,
				),
		},
		(args) => ({ kind: "layoutObjects", ...args }),
		{ drives: ["docOps.layoutObjects"] },
	);

	const groupObjectsTool = defineCanvasTool(
		"group_objects",
		"Wrap objects in a new group. They must share one parent (not sit in different groups); connectors cannot be grouped.",
		{
			ids: z.array(z.string()).min(2).describe("ids to group."),
		},
		(args) => ({ kind: "groupObjects", ...args }),
		{ drives: ["docOps.groupObjects"] },
	);

	const dissolveGroupsTool = defineCanvasTool(
		"dissolve_groups",
		[
			"Dissolve groups, many per call, each leaving its children in place.",
			"A group and one nested in it may be named together, in either order. All or nothing: a missing, non-group or rotated id fails the call and is named. Returns the ids released.",
		].join(" "),
		{
			ids: z
				.array(z.string())
				.min(1)
				.describe("ids of the groups to dissolve."),
		},
		(args) => ({ kind: "dissolveGroups", ...args }),
		{ drives: ["docOps.dissolveGroups"] },
	);

	const addToGroupTool = defineCanvasTool(
		"add_to_group",
		"Move existing objects into an existing group; nothing moves on the canvas. A group the move empties is dropped, and connectors cannot join a group.",
		{
			groupId: z.string().describe("id of the group to move them into."),
			ids: z
				.array(z.string())
				.min(1)
				.describe("ids to move in; they are drawn on top within the group."),
		},
		(args) => ({ kind: "addToGroup", ...args }),
		{ drives: ["docOps.addObjectsToGroup"] },
	);

	const removeFromGroupTool = defineCanvasTool(
		"remove_from_group",
		"Take objects out of the group holding them, leaving them where they are; dissolve_groups dissolves a whole group. A group left empty is dropped.",
		{
			ids: z
				.array(z.string())
				.min(1)
				.describe("ids to take out; each must currently sit inside a group."),
		},
		(args) => ({ kind: "removeFromGroup", ...args }),
		{ drives: ["docOps.removeObjectsFromGroup"] },
	);

	const captureCanvasTool = defineCanvasTool(
		"capture_canvas",
		[
			"Render the canvas to a PNG and hand it back to you, to judge what only the eye catches: lines through shapes, overlaps, labels spilling out.",
			'Given nothing, it is the whole drawing fitted to its content; ids, rect or target "selection" take a part at 1 world unit to 1 px.',
			`Either way the picture shrinks only past ${MAX_CAPTURE_PIXEL_SIZE} px on its long edge, so take a large drawing a part at a time.`,
			"It crops by default; isolate draws only what is named. A rect is taken exactly and needs extent on both axes; ids and the selection get the document's margin.",
			"The result names the world rect covered and the pixel size, so a spot can go to hit_test. Never read exact numbers off the picture.",
		].join(" "),
		{
			...regionSchema,
			// capture_canvas only: regionSchema is shared with fit_view
			isolate: z
				.boolean()
				.optional()
				.describe(
					'With ids or target "selection" only (an error otherwise). true draws just the objects named, their descendants and the connectors whose attached ends are all on them; the default false crops, keeping whatever else is drawn there.',
				),
		},
		(args) => ({ kind: "captureCanvas", ...args }),
		{ isReadOnly: true, drives: ["handle.export.capturePng"] },
	);

	// The measurement tools below answer with numbers what capture_canvas can only
	// hint at in a picture.

	const measureTextTool = defineCanvasTool(
		"measure_text",
		[
			"Measure how one label came out: its box, the wrapped text's size, its line count, and whether the shape clips it and by how much.",
			"A markdown card is measured as the HTML it renders to, with no line count.",
		].join(" "),
		{
			id: z.string().describe("id of the object whose label is measured."),
			slot: textSlotArgSchema(""),
		},
		(args) => ({ kind: "measureText", ...args }),
		{ isReadOnly: true, drives: ["handle.measure.textSlot"] },
	);

	const findOverlapsTool = defineCanvasTool(
		"find_overlaps",
		[
			"List the pairs of shapes whose bounding boxes overlap, with the shared rect and its size.",
			"Identical boxes come first, then partial overlaps; pairs where one box contains the other are only counted unless includeContained lists them last, naming which contains which.",
			"Connectors and groups are never compared. Much overlap is meant (a text on a shape, a node in a container). An empty result means no two boxes overlap.",
		].join(" "),
		{
			ids: z
				.array(z.string())
				.optional()
				.describe(
					"Shapes to compare with one another only; omit for everything.",
				),
			includeContained: z
				.boolean()
				.optional()
				.describe(
					"true also lists the pairs where one box contains the other, after the rest; false (the default) only counts them.",
				),
		},
		(args) => ({ kind: "findOverlaps", ...args }),
		{ isReadOnly: true, drives: ["handle.measure.findOverlaps"] },
	);

	const measureConnectorPathTool = defineCanvasTool(
		"measure_connector_path",
		"Trace where a connector is really drawn: both endpoints as they landed on the outlines and every corner the router put in, none of which the document stores.",
		{
			id: z.string().describe("id of the connector to trace."),
		},
		(args) => ({ kind: "measureConnectorPath", ...args }),
		{ isReadOnly: true, drives: ["handle.measure.connectorPath"] },
	);

	const measureVisualBoundsTool = defineCanvasTool(
		"measure_visual_bounds",
		[
			"Measure the rect objects really cover once drawn, decoration outside their geometry included (a label below, a shadow, arrowheads); fit_view frames the same.",
			"One rect, the union of all ids: measure them one at a time to tell them apart.",
		].join(" "),
		{
			ids: z
				.array(z.string())
				.min(1)
				.describe("ids to measure; their union comes back."),
		},
		(args) => ({ kind: "measureVisualBounds", ...args }),
		{ isReadOnly: true, drives: ["handle.measure.visualBounds"] },
	);

	const hitTestTool = defineCanvasTool(
		"hit_test",
		[
			"Name what is drawn at a world point, or every object reaching into a world rect, front-most first.",
			"A point is tested against the drawn outline (an ellipse is not hit at its box's corner, a connector only near its line); a rect against bounding boxes. Groups are never named, only their members.",
			"Take coordinates from the document or the measurements, never from a capture_canvas picture. Nothing there is an answer, not a failure.",
		].join(" "),
		{
			point: pointSchema
				.optional()
				.describe("World point to test; give exactly one of point and rect."),
			rect: rectSchema
				.optional()
				.describe(
					"World rect to collect everything reaching into; give exactly one of point and rect.",
				),
			tolerance: z
				.number()
				.min(0)
				.optional()
				.describe(
					"World px beyond its line a connector or polyline still counts as hit; 4 when omitted. Shapes with an area ignore it.",
				),
		},
		(args) => ({ kind: "hitTest", ...args }),
		{ isReadOnly: true, drives: ["handle.measure.hitTest"] },
	);

	const getSelectionTool = defineCanvasTool(
		"get_selection",
		[
			'Read which objects the user has selected right now, which is what "this" or "these" points at.',
			"An empty selection is an answer, not a failure; select_objects sets it.",
		].join(" "),
		{},
		() => ({ kind: "getSelection" }),
		{ isReadOnly: true, drives: ["handle.selection.getSelectedIds"] },
	);

	const getViewTool = defineCanvasTool(
		"get_view",
		[
			"Read the view: the world point at the camera's top-left, the zoom, the drawing area's size in screen px, and the world rect on screen.",
			"The three camera numbers go back to set_view as they are.",
		].join(" "),
		{},
		() => ({ kind: "getView" }),
		{
			isReadOnly: true,
			drives: [
				"handle.viewport.getViewport",
				"handle.viewport.getVisibleWorldRect",
			],
		},
	);

	const getInteractionStatusTool = defineCanvasTool(
		"get_interaction_status",
		[
			"Read what the user is doing on the canvas right now: the kind of drag under way, the object whose text is open in the editor, whether the view is coasting from a pan, the armed drawing tool, and an open dialog.",
			"While a text is open, or a drag other than inert, pan or marquee is under way, hold off on every edit until it ends: an edit written meanwhile can cut off what the user is doing.",
			"A snapshot of the moment: read it again rather than trusting an old answer.",
		].join(" "),
		{},
		() => ({ kind: "getInteractionStatus" }),
		{ isReadOnly: true, drives: ["handle.interaction.getStatus"] },
	);

	const toWorldTool = defineCanvasTool(
		"to_world",
		[
			"Convert a client coordinate (a browser pointer event's, from the window's top-left) into the world coordinate the canvas draws in.",
			"Every other tool already speaks world coordinates; this is for a position read off the page. Fails until the canvas has mounted.",
		].join(" "),
		{
			x: z.number().describe("Client x in px from the window's left edge."),
			y: z.number().describe("Client y in px from the window's top edge."),
		},
		(args) => ({ kind: "toWorld", ...args }),
		{ isReadOnly: true, drives: ["handle.viewport.toWorld"] },
	);

	const toClientTool = defineCanvasTool(
		"to_client",
		[
			"Convert a world coordinate into where it sits on screen now, in client coordinates: the inverse of to_world.",
			"True only until the next pan or zoom. Fails until the canvas has mounted.",
		].join(" "),
		{
			x: z.number().describe("World x in px."),
			y: z.number().describe("World y in px."),
		},
		(args) => ({ kind: "toClient", ...args }),
		{ isReadOnly: true, drives: ["handle.viewport.toClient"] },
	);

	const selectObjectsTool = defineCanvasTool(
		"select_objects",
		[
			"Select objects as a click would, to point at them while you talk; fit_view on the selection then frames them.",
			"A connector is selected only on its own: named with anything else it is left out, and the result says so.",
		].join(" "),
		{
			ids: z
				.array(z.string())
				.describe("ids to select; [] clears the selection."),
		},
		(args) => ({ kind: "selectObjects", ...args }),
		{ drives: ["handle.selection.select"] },
	);

	const centerViewTool = defineCanvasTool(
		"center_view",
		"Move the view so a world point sits in the middle of the screen; nothing on the canvas moves.",
		{
			x: z.number().describe("World x to center on."),
			y: z.number().describe("World y to center on."),
			zoom: z
				.number()
				.min(0.1)
				.max(10)
				.optional()
				.describe("Zoom factor, 1 being 100%; omit to keep the current zoom."),
		},
		(args) => ({ kind: "centerView", ...args }),
		{ drives: ["handle.viewport.centerOn"] },
	);

	const setViewTool = defineCanvasTool(
		"set_view",
		[
			"Put the view's top-left at a world point at a zoom: the three numbers get_view reports, which is how the user is put back.",
			"center_view and fit_view work the camera out for you. Nothing on the canvas moves.",
		].join(" "),
		{
			minX: z
				.number()
				.describe("World x of the view's top-left, as get_view reports."),
			minY: z
				.number()
				.describe("World y of the view's top-left, as get_view reports."),
			zoom: z
				.number()
				.min(0.1)
				.max(10)
				.describe(
					"Zoom factor, 1 being 100%; required (get_view reads the current one).",
				),
		},
		(args) => ({ kind: "setView", ...args }),
		{ drives: ["handle.viewport.setViewport"] },
	);

	const fitViewTool = defineCanvasTool(
		"fit_view",
		[
			'Frame the whole drawing ("all"), the selection, the objects named (around what they draw) or a world rect in the view; give exactly one of target, ids and rect.',
			"The window's proportions may show more than asked on one axis; get_view reads back what is on screen.",
			"Fails when there is nothing to frame: an empty canvas or selection, ids drawing nothing, or a rect with no extent on either axis (one flat on a single axis still fits along the other).",
		].join(" "),
		regionSchema,
		(args) => ({ kind: "fitView", ...args }),
		{
			drives: [
				"handle.viewport.fitToContent",
				"handle.viewport.fitToSelection",
				"handle.viewport.fitToRect",
				"handle.measure.visualBounds",
			],
		},
	);

	const undoTool = defineCanvasTool(
		"undo",
		"Take back your own last canvas change. Refused once the user has edited the canvas themselves; fix things forward then.",
		{},
		() => ({ kind: "undo" }),
		// The AI's own snapshot history, kept by the host apart from the canvas undo
		// stack so it can never reach a change the user made
		{ drives: ["agent"] },
	);

	return [
		describeCanvasTool,
		listObjectsTool,
		findObjectsTool,
		getObjectTool,
		getObjectBoundsTool,
		getCombinedBoundsTool,
		getTextTool,
		getZOrderTool,
		getParentGroupTool,
		getGroupMembersTool,
		getConnectorsTool,
		getConnectedObjectsTool,
		listTypesTool,
		captureCanvasTool,
		measureTextTool,
		findOverlapsTool,
		measureConnectorPathTool,
		measureVisualBoundsTool,
		hitTestTool,
		getSelectionTool,
		getViewTool,
		getInteractionStatusTool,
		toWorldTool,
		toClientTool,
		addObjectsTool,
		connectManyTool,
		deleteObjectsTool,
		setPositionsTool,
		translateObjectsTool,
		resizeObjectsTool,
		setHeightModeTool,
		setRotationTool,
		setPointsManyTool,
		reorderObjectsTool,
		setStyleTool,
		setBackgroundTool,
		setDocumentViewTool,
		setMetaTool,
		setExtraPropsTool,
		setTextsTool,
		setTextStylesTool,
		updateConnectorsTool,
		alignObjectsTool,
		distributeObjectsTool,
		layoutObjectsTool,
		groupObjectsTool,
		dissolveGroupsTool,
		addToGroupTool,
		removeFromGroupTool,
		selectObjectsTool,
		centerViewTool,
		setViewTool,
		fitViewTool,
		undoTool,
	];
};
