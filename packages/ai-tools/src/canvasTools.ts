// The declaration of every canvas tool an AI can call: its name, the wording the
// model reads, the argument schema, how validated arguments become an
// {@link AiCanvasOp}, and which canvas API ends up driven (see canvasApiRef.ts).
//
// Nothing here knows how the tools reach a model. Wrapping a descriptor for the
// Claude Agent SDK, or turning it into a `{ name, description, input_schema }`
// entry for the Messages API, is the host's job — which is why zod is the source
// of truth: `z.toJSONSchema(z.object(inputSchema))` derives the JSON Schema, and
// there is no way back.

import { z } from "zod";

import type { CanvasApiRef } from "./canvasApiRef";
import { MAX_DESCRIBE_CHARS, MAX_SVG_CHARS } from "./canvasOps";
import type {
	AiAlignEdge,
	AiArrowType,
	AiCanvasOp,
	AiDistributeAxis,
	AiRouting,
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
	/** The argument schema as a zod raw shape (the properties, not a z.object) */
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

const ANCHOR_HANDLE_IDS = [
	"center",
	"topCenter",
	"rightCenter",
	"bottomCenter",
	"leftCenter",
] as const;

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

const ROUTINGS = [
	"straight",
	"orthogonal",
] as const satisfies readonly AiRouting[];

const ARROW_TYPES = [
	"FilledTriangle",
	"ConcaveTriangle",
	"OpenArrow",
	"HollowTriangle",
	"FilledDiamond",
	"HollowDiamond",
	"Circle",
	"HollowCircle",
	"Cross",
	"CrowFootMany",
	"CrowFootOneMany",
	"CrowFootZeroMany",
	"CrowFootOne",
	"CrowFootZeroOne",
	"None",
] as const satisfies readonly AiArrowType[];

/**
 * The shared style vocabulary; add_object and set_style speak the same one.
 * Properties a type has no place for (fill on a connector, an arrowhead on a rect,
 * a font colour on a shape without text) are dropped by docOps, which says so in the
 * tool result.
 */
const styleSchema = {
	fill: z
		.string()
		.optional()
		.describe(
			[
				'Background color, any CSS color ("#e3f2fd", "transparent").',
				"There is no opacity property: write the alpha into the color itself, rgba(37, 99, 235, 0.15) or #2563EB26, so what sits behind still shows through.",
				"On a connector this colors its label instead.",
			].join(" "),
		),
	stroke: z
		.string()
		.optional()
		.describe(
			"Outline color, any CSS color; rgba() and #RRGGBBAA make it semi-transparent. On a connector this is the color of the line itself.",
		),
	strokeWidth: z.number().min(0).optional().describe("Outline width in px."),
	strokeDashType: z
		.enum(["solid", "dashed", "dotted"])
		.optional()
		.describe("Outline dash pattern."),
	startArrow: z
		.enum(ARROW_TYPES)
		.optional()
		.describe(
			"Arrowhead at the start of the line. Only for polyline and connector; every other type ignores it. A connector's arrowheads can also be set as it is drawn, by connect.",
		),
	endArrow: z
		.enum(ARROW_TYPES)
		.optional()
		.describe(
			"Arrowhead at the end of the line, the one that carries the direction (FilledTriangle for a flow). Only for polyline and connector.",
		),
	rx: z.number().min(0).optional().describe("Corner radius in px; rect only."),
	fontColor: z.string().optional().describe("Text color, any CSS color."),
	fontSize: z.number().min(1).optional().describe("Text size in px."),
	fontWeight: z.enum(["normal", "bold"]).optional().describe("Text weight."),
	textAlign: z
		.enum(["left", "center", "right"])
		.optional()
		.describe("Horizontal text alignment inside the shape."),
	verticalAlign: z
		.enum(["top", "middle", "bottom"])
		.optional()
		.describe("Vertical text alignment inside the shape."),
};

const pointSchema = z.object({
	x: z.number().describe("World x in px."),
	y: z.number().describe("World y in px."),
});

/**
 * The typography a stretch of characters carries on its own; set_text_style and
 * set_text_styles decorate part of a body with it. Alignment is absent on purpose:
 * it places the whole body, so it lives in the styleSchema set_style speaks.
 */
const inlineTextStyleSchema = {
	fontColor: z
		.string()
		.optional()
		.describe("Color of the matched characters, any CSS color."),
	fontSize: z
		.number()
		.min(1)
		.optional()
		.describe(
			"Size of the matched characters in px; the rest of the body keeps the shape's own size.",
		),
	fontFamily: z
		.string()
		.optional()
		.describe(
			'Font family for the matched characters, from the four the canvas ships faces for: \'"Source Sans 3", "Noto Sans JP", sans-serif\' (sans), \'"Source Serif 4", "Noto Serif JP", serif\' (serif), \'"Source Code Pro", "Noto Sans JP", monospace\' (monospace, e.g. for a code term inside a sentence), \'Caveat, "Klee One", cursive\' (handwriting).',
		),
	fontWeight: z
		.enum(["normal", "bold"])
		.optional()
		.describe(
			'Weight of the matched characters; "normal" takes bold off again.',
		),
	fontStyle: z
		.enum(["normal", "italic"])
		.optional()
		.describe(
			'Slant of the matched characters; "normal" stands them upright again.',
		),
	textDecoration: z
		.enum(["none", "underline", "line-through", "underline line-through"])
		.optional()
		.describe('Line drawn on the matched characters; "none" removes it.'),
};

/**
 * Which characters to decorate: the text itself rather than an offset, since an
 * offset is something the model would have to count out of a string it wrote.
 */
const textStretchSchema = {
	match: z
		.string()
		.min(1)
		.describe(
			"The characters to decorate, matched literally against the object's own text. Must occur in it — a stretch that does not is an error, not a silent no-op.",
		),
	occurrence: z
		.number()
		.int()
		.min(1)
		.optional()
		.describe(
			"Which occurrence to decorate when the text holds several, counted from 1. Omit to decorate every occurrence.",
		),
	slot: z
		.string()
		.optional()
		.describe(
			'For shapes that keep several named texts (record: "name" / "attributes" / "operations"), which one holds the stretch. Omit for the shape\'s single body of text.',
		),
};

/** The endpoints and options one connector is drawn with; connect and connect_many share them. */
const connectorDrawSchema = {
	sourceId: z
		.string()
		.optional()
		.describe(
			"id of the source object; give sourcePoint instead to leave this end unattached.",
		),
	targetId: z
		.string()
		.optional()
		.describe(
			"id of the target object; give targetPoint instead to leave this end unattached.",
		),
	sourcePoint: pointSchema
		.optional()
		.describe(
			"World coordinate to stand the source end at instead of attaching it. Cannot be combined with sourceId or sourceAnchor, and the target end must then be attached.",
		),
	targetPoint: pointSchema
		.optional()
		.describe(
			"World coordinate to stand the target end at instead of attaching it. Cannot be combined with targetId or targetAnchor, and the source end must then be attached.",
		),
	sourceAnchor: z
		.enum(ANCHOR_HANDLE_IDS)
		.optional()
		.describe("Anchor on the source (default center)."),
	targetAnchor: z
		.enum(ANCHOR_HANDLE_IDS)
		.optional()
		.describe("Anchor on the target (default center)."),
	startArrow: z
		.enum(ARROW_TYPES)
		.optional()
		.describe("Arrowhead at the source end."),
	endArrow: z
		.enum(ARROW_TYPES)
		.optional()
		.describe("Arrowhead at the target end (use FilledTriangle for a flow)."),
	label: z
		.string()
		.optional()
		.describe(
			'Text drawn on the line, e.g. "yes" / "no". Sits on the line itself, so never place a separate text shape next to a connector.',
		),
	routing: z
		.enum(ROUTINGS)
		.optional()
		.describe(
			"Line shape; omitted derives it from the anchors (center ends give a straight line).",
		),
	points: z
		.array(pointSchema)
		.optional()
		.describe(
			[
				"Corners the line bends at, source → target, excluding the endpoints. As many as you like — there is no limit.",
				'With routing "straight" the line is drawn through exactly these points, so a single connector is a whole polyline.',
				"The two endpoints are named by sourceId / sourcePoint and targetId / targetPoint; every bend between them belongs here. Never put an invisible shape at each bend and chain connectors between them.",
				"Omit to let the engine route it.",
			].join(" "),
		),
};

/** The changes one existing connector takes; update_connector and update_connectors share them. */
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
			"Detach the source end and stand it at this world coordinate. Cannot be combined with sourceId or sourceAnchor, and is refused when it would leave both ends unattached.",
		),
	targetPoint: pointSchema
		.optional()
		.describe(
			"Detach the target end and stand it at this world coordinate. Cannot be combined with targetId or targetAnchor, and is refused when it would leave both ends unattached.",
		),
	sourceAnchor: z
		.enum(ANCHOR_HANDLE_IDS)
		.optional()
		.describe("Move the source end to this anchor."),
	targetAnchor: z
		.enum(ANCHOR_HANDLE_IDS)
		.optional()
		.describe("Move the target end to this anchor."),
	startArrow: z
		.enum(ARROW_TYPES)
		.optional()
		.describe('Arrowhead at the source end; "None" removes it.'),
	endArrow: z
		.enum(ARROW_TYPES)
		.optional()
		.describe('Arrowhead at the target end; "None" removes it.'),
	routing: z.enum(ROUTINGS).optional().describe("Line shape."),
	points: z
		.array(pointSchema)
		.optional()
		.describe(
			[
				"Corners the line bends at, source → target, excluding the endpoints. As many as you like — there is no limit.",
				'With routing "straight" the line is drawn through exactly these points, so a single connector is a whole polyline.',
				"[] gives the route back to the engine.",
			].join(" "),
		),
	labelPosition: z
		.number()
		.min(0)
		.max(1)
		.optional()
		.describe(
			"Where the label sits along the line: 0 at the source, 1 at the target, 0.5 the middle.",
		),
	labelOffset: z
		.number()
		.optional()
		.describe(
			"How far the label sits off the line in px; the sign picks the side. Use it when the label overlaps the line or another shape.",
		),
};

const rectSchema = z.object({
	x: z.number().describe("Top-left x in px."),
	y: z.number().describe("Top-left y in px."),
	width: z.number().min(0).describe("Width in px, rightwards from x."),
	height: z.number().min(0).describe("Height in px, downwards from y."),
});

/**
 * Declares the whole canvas tool set.
 *
 * The type list reaches the host at session start, so the descriptors are rebuilt
 * every time. Without it the type falls back to a free string, and a wrong type
 * surfaces as the docOps error carried back in the tool result.
 *
 * @param capabilities - The shape types to name in the schemas. null means "not
 *   received yet", which makes the add_object type a free string instead of an enum
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
			"Read the current canvas document. Returns the CanvasDoc JSON, including every object's id, type, position, size and style. Call this before adding or editing anything so you know what already exists, what its ids are, and where the free space is.",
			`The result is cut off once the document runs past ${MAX_DESCRIBE_CHARS.toLocaleString("en-US")} characters, which a drawing of some 50 objects already does, and the part beyond that cannot be reached through this tool at all.`,
			"So use it on small drawings only: on anything larger read list_objects for the whole map, find_objects to narrow it down, and get_object for the one object you need in full — those stay small however big the drawing grows.",
		].join(" "),
		{},
		() => ({ kind: "describeCanvas" }),
		// The host serializes the document it already holds; no doc-ops read is involved
		{ isReadOnly: true, drives: ["agent"] },
	);

	const listObjectsTool = defineCanvasTool(
		"list_objects",
		[
			"Map the whole canvas: one summary per object — id, type, bounding box, the group holding it, and its text — in drawing order, back to front, each group followed straight away by what it holds.",
			"This is what you read on a drawing you did not just build yourself, and the summaries are an order of magnitude smaller than the objects they stand for, so this survives on drawings where describe_canvas is cut off.",
			"The usual way round a large canvas is this tool for the layout, find_objects to narrow down to what you are after, and get_object for the full detail of one object.",
			"Objects that cannot be measured (a connector, an empty group) report a null box, which is not an error.",
			"Very large drawings are cut off here too, and the result says so; narrow with find_objects rather than reading the rest.",
		].join(" "),
		{},
		() => ({ kind: "listObjects" }),
		{ isReadOnly: true, drives: ["docOps.listObjects"] },
	);

	const findObjectsTool = defineCanvasTool(
		"find_objects",
		[
			"Search the canvas, returning the same summaries list_objects returns for the objects that match.",
			'Narrow by type, by the text an object carries, by a rectangle it sits entirely inside, or by the group holding it — this is how you answer "which boxes say Login", "what is in this group", "what stands in the top-left corner" without reading the whole drawing.',
			"Every condition given must hold, so naming two narrows rather than widens, and an object that cannot answer a condition fails it: one holding no text never matches text, one with no box never matches within.",
			"An empty result means nothing on the canvas matches, not that the call failed.",
			"Give no condition at all and this is list_objects; take one match to get_object for its every field.",
		].join(" "),
		{
			type: z
				.union([z.string(), z.array(z.string()).min(1)])
				.optional()
				.describe(
					'Keep only these types, one name or several ("rect", ["rect", "ellipse"]); omit to keep every type. Names are the ones add_object takes, which list_types spells out.',
				),
			text: z
				.string()
				.optional()
				.describe(
					"Keep objects whose text contains this, matched case-insensitively as a substring against the same characters get_text returns. A shape holding no text never matches.",
				),
			within: rectSchema
				.optional()
				.describe(
					"Keep objects whose bounding box sits entirely inside this rect, edges touching included. It is containment and not intersection, so a shape straddling the edge is left out, and a shape with no box (a connector, an empty group) never matches.",
				),
			inGroup: z
				.string()
				.optional()
				.describe(
					"Keep the direct children of this group only; a nested group's own children belong to that group, so ask for it in turn. Fails when the id is not a group.",
				),
		},
		(args) => ({ kind: "findObjects", ...args }),
		{ isReadOnly: true, drives: ["docOps.findObjects"] },
	);

	const getObjectTool = defineCanvasTool(
		"get_object",
		[
			"Read one object in full: every field its type declares — place, size, style, rotation, vertices, text slots, a connector's endpoints and route — as JSON.",
			"This is the detail behind a list_objects or find_objects summary, and the way to read what you need out of a drawing of any size without asking for the whole document.",
			"Reading a handful of objects one by one is still far smaller than describe_canvas on a large canvas.",
			"Fails when no object carries the id, so it doubles as the check that an id you were given is real.",
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
			"Measure the box one object occupies, in world coordinates: the same top-left form add_object takes and set_position writes back, so the numbers go straight back into your next call.",
			"Rotation is ignored — it turns a shape about its own centre, and this is the untransformed box every placement op works on.",
			"A group is measured from what it holds, which is the one way to get its extent.",
			"Objects that cannot be measured (a connector, which follows the objects it joins; a group holding nothing) say so rather than failing.",
			"For what an object actually draws, decoration outside its geometry included, use measure_visual_bounds instead.",
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
			"Measure the single box several objects occupy together, or the whole drawing when ids are omitted.",
			"Omitting ids is how you find out how far the canvas already reaches, so you can place new content past its edge instead of guessing — read the box, then add_object beyond its right or bottom edge.",
			"Ids that contribute nothing (a connector, an empty group) are simply skipped, and a set that contributes nothing at all says so rather than failing; an id that is not on the canvas is an error.",
			"Rotation is ignored, as in get_object_bounds.",
		].join(" "),
		{
			ids: z
				.array(z.string())
				.min(1)
				.optional()
				.describe(
					"ids to measure together; omit to measure everything on the canvas, which is what you want before placing new content.",
				),
		},
		(args) => ({ kind: "getCombinedBounds", ...args }),
		{ isReadOnly: true, drives: ["docOps.getCombinedBounds"] },
	);

	const getTextTool = defineCanvasTool(
		"get_text",
		[
			"Read one object's text as plain characters: inline styling dropped and rows joined by newlines, which is what set_text would take back.",
			"Use it to check a label you are about to rewrite, and to read a text too long for the list_objects summary to be worth trusting.",
			"On a connector this reads the label drawn on the line.",
			"An object whose text is empty says so; a type that holds no text at all is an error, as is an unknown slot.",
		].join(" "),
		{
			id: z.string().describe("id of the object to read the text of."),
			slot: z
				.string()
				.optional()
				.describe(
					'For shapes that keep several named texts (record: "name" / "attributes" / "operations"), which one to read. Omit for the shape\'s single body of text; list_types says which types keep slots.',
				),
		},
		(args) => ({ kind: "getText", ...args }),
		{ isReadOnly: true, drives: ["docOps.getText"] },
	);

	const getZOrderTool = defineCanvasTool(
		"get_z_order",
		[
			"Read where an object stands in the stacking order: its position among its siblings, counting from the back, and how many siblings it stands among.",
			"Both are counted inside the parent holding it — a group's child among its siblings, never against the whole canvas — which is also how reorder_objects moves it.",
			"Call it before restacking to know whether a move would change anything at all: an object already at the front stays where it is however often you send it there.",
		].join(" "),
		{
			id: z.string().describe("id of the object to locate."),
		},
		(args) => ({ kind: "getZOrder", ...args }),
		{ isReadOnly: true, drives: ["docOps.getZOrder"] },
	);

	const getParentGroupTool = defineCanvasTool(
		"get_parent_group",
		[
			"Read which group holds an object, or that it sits at the top level in none.",
			"Sitting in no group is an answer, not a failure — only an id that is not on the canvas fails.",
			"Read it before moving or restacking something you did not place yourself: an object inside a group is restacked among its siblings only, and taking it out is remove_from_group.",
		].join(" "),
		{
			id: z.string().describe("id of the object whose group is read."),
		},
		(args) => ({ kind: "getParentGroup", ...args }),
		{ isReadOnly: true, drives: ["docOps.getParentGroup"] },
	);

	const getGroupMembersTool = defineCanvasTool(
		"get_group_members",
		[
			"List what a group holds directly, in drawing order, back to front.",
			"Only its own children come back: a nested group is named as one id, and what that group holds is read by asking for it in turn.",
			"Use it to work out what dissolve_group would release, and what a resize_object on the group would scale.",
			"Fails when the id is not on the canvas or names something that is not a group.",
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
			"This is how you find the line to re-route or re-label with update_connector without reading the whole drawing, and how you know what delete_objects would take with the object.",
			"Only the ids come back; pass one to get_object for its endpoints, arrowheads and route, or to measure_connector_path for where it is actually drawn.",
			"An object with nothing attached says so, which is an answer and not a failure.",
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
			"List the objects at the far end of this object's connectors, each named once however many lines run to it.",
			"This is one step through the diagram: what a flowchart node leads to and comes from, what an entity is related to — walk it id by id instead of reading the whole document to trace a path.",
			"The object itself and ends hanging at a bare coordinate are left out, and the direction of a line is not distinguished, so use get_connectors and get_object when you need to tell incoming from outgoing.",
			"An object connected to nothing says so, which is an answer and not a failure.",
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
			"List every object type this canvas knows and what each one can be asked to do: whether add_object can create it, whether connect may put an endpoint on it, what text it carries (one body, named slots, or none) and how its shape is stored.",
			"The geometry answers which ops apply: only a poly type takes set_points, and a type stored as a point takes its size from its content rather than resize_object.",
			"Read it when a call was refused for the type rather than the arguments, and before writing a named slot with set_text.",
			"It describes the canvas rather than the drawing, so it answers the same on an empty one.",
		].join(" "),
		{},
		() => ({ kind: "listTypes" }),
		{ isReadOnly: true, drives: ["docOps.listTypes"] },
	);

	// add_object and one entry of add_objects speak the same vocabulary. Build the
	// schema once here so the two cannot drift apart
	const objectTypeSchema =
		firstType === undefined
			? z.string().describe("Object type to add, e.g. rect / ellipse.")
			: z.enum([firstType, ...restTypes]).describe("Object type to add.");

	const newObjectSchema = {
		x: z.number().describe("Top-left x in px."),
		y: z.number().describe("Top-left y in px."),
		width: z
			.number()
			.min(0)
			.optional()
			.describe("Width in px (default: the shape's own default)."),
		height: z
			.number()
			.min(0)
			.optional()
			.describe("Height in px (default: the shape's own default)."),
		text: z
			.string()
			.optional()
			.describe(
				"Label text inside the object. Only for shapes with a single text body: record keeps its title and rows in keyed text slots and rejects a plain string, so use set_text there.",
			),
		points: z
			.array(pointSchema)
			.min(2)
			.optional()
			.describe(
				[
					"Vertices in world coordinates, in drawing order; polygon and polyline only. A polygon closes itself, so never repeat the first vertex; it needs 3 vertices, a polyline 2.",
					"These decide where the shape sits and how big it is, so x / y / width / height are ignored outright — x and y are still required by this schema, so pass the top-left of the vertices and let the vertices do the work.",
					"Omitting them leaves the type's own outline: a regular pentagon for a polygon, a horizontal segment for a polyline.",
					"This is how you draw a shape the built-in types do not cover; set_points reshapes it afterwards.",
				].join(" "),
			),
		rotation: z
			.number()
			.optional()
			.describe(
				"Clockwise degrees about the shape's own centre; 0 is upright. Ignored by types that cannot turn (polygon, polyline, connector) — turn those by giving turned points instead.",
			),
		extraProps: z
			.record(z.string(), z.unknown())
			.optional()
			.describe(
				[
					"Properties belonging to the type itself, which the arguments above do not cover: lucideIcon's `icon`, callout's `tail`, container's `headerFill` / `headerHeight`.",
					"Read the type's own schema for the names it has and what they hold; a malformed value is refused with the reason, so a rejected call can be corrected and retried.",
					"Do not repeat an argument above here (x, width, text, a style property, …) — that is refused outright.",
				].join(" "),
			),
		...styleSchema,
	};

	const addObjectTool = defineCanvasTool(
		"add_object",
		[
			"Add one object to the canvas; placing several at once is add_objects instead.",
			"x / y are the top-left corner of the object's bounding box, in px; +x is right and +y is down.",
			"Omitting width / height uses the shape's own default size.",
			"Style it here rather than in a second call; anything the type cannot hold is ignored.",
			"Returns the new object id, which you need for connect and every edit.",
		].join(" "),
		{ type: objectTypeSchema, ...newObjectSchema },
		(args) => ({ kind: "addObject", ...args }),
		{ drives: ["docOps.addObject"] },
	);

	const addObjectsTool = defineCanvasTool(
		"add_objects",
		[
			"Add many objects in one call. Use this for every layout with more than one shape, instead of calling add_object again and again.",
			"Each entry takes exactly what add_object takes, and the objects are created in the order given.",
			"All or nothing: if one entry is rejected nothing is added at all, and the error names the index that failed.",
			"Returns the new ids in that same order, which you need for connect and every edit.",
		].join(" "),
		{
			objects: z
				.array(z.object({ type: objectTypeSchema, ...newObjectSchema }))
				.min(1)
				.describe("The objects to add, in creation order."),
			groupNewObjects: z
				.boolean()
				.optional()
				.describe(
					"Wrap everything this call adds in one new group (needs at least 2 objects), so the user can move the cluster as one. The result names the group id.",
				),
			parentGroupId: z
				.string()
				.optional()
				.describe(
					"Put the new objects inside this existing group instead of on the canvas itself. Cannot be combined with groupNewObjects.",
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

	const connectableNote =
		capabilities === null
			? ""
			: ` Connectable types: ${capabilities.connectableObjectTypes.join(", ")}.`;

	const connectTool = defineCanvasTool(
		"connect",
		[
			`Join two existing objects with a connector.${connectableNote}`,
			'Anchoring both ends to "center" gives a straight line; edge anchors give an orthogonal route and are what keeps a line from cutting across a shape.',
			'This is also how you draw a free path: routing "straight" plus points makes one connector run through every corner you name — a chart line, a bracket, a route around obstacles.',
			"One end may stand at a bare coordinate instead of an object (sourcePoint / targetPoint), but never both: a line attached to nothing is a polyline, so add_object a polyline with points for that.",
			"Use update_connector afterwards to re-route or re-attach it.",
		].join(" "),
		{ ...connectorDrawSchema },
		(args) => ({ kind: "connect", ...args }),
		{ drives: ["docOps.connect"] },
	);

	const connectManyTool = defineCanvasTool(
		"connect_many",
		[
			"Draw many connectors in one call: the batch form of connect, each entry taking exactly what connect takes — the two ends, their anchors, arrowheads, label and route.",
			"This is the second half of building a diagram: add_objects for every node, then this for every edge between them, instead of calling connect once per line.",
			"Endpoints are resolved against the canvas as it already stands, so an object created in the same turn has to be added before this call, never inside it.",
			"All or nothing: if one entry is rejected nothing is drawn at all, and the error names the entry that failed — a guarantee a loop of connect calls cannot give you, since it would leave the lines it already drew behind.",
			"Returns the new connector ids in the order given.",
		].join(" "),
		{
			entries: z
				.array(z.object(connectorDrawSchema))
				.min(1)
				.describe("The connectors to draw, in drawing order."),
		},
		(args) => ({ kind: "connectMany", ...args }),
		{ drives: ["docOps.connectMany"] },
	);

	const deleteObjectsTool = defineCanvasTool(
		"delete_objects",
		"Delete objects by id. Connectors attached to a deleted object go with it, and so do a group's children, so you never have to clean those up yourself.",
		{
			ids: z.array(z.string()).min(1).describe("ids to delete."),
		},
		(args) => ({ kind: "deleteObjects", ...args }),
		{ drives: ["docOps.deleteObjects"] },
	);

	const setPositionTool = defineCanvasTool(
		"set_position",
		"Move one object so its bounding box starts at the given top-left. Give at least one of x / y; the axis you leave out stays where it is. Connectors attached to it follow on their own.",
		{
			id: z.string().describe("id of the object to move."),
			x: z.number().optional().describe("New top-left x in px."),
			y: z.number().optional().describe("New top-left y in px."),
		},
		(args) => ({ kind: "setPosition", ...args }),
		{ drives: ["docOps.setPosition"] },
	);

	const setPositionsTool = defineCanvasTool(
		"set_positions",
		[
			"Move many objects to places of their own: the batch form of set_position, each entry carrying an absolute top-left exactly as set_position does.",
			"This is how a layout you worked out yourself is applied — every box lands at the coordinates you computed, in one call and one undo step, instead of a set_position per shape.",
			"An omitted axis leaves that object where it is, per entry. To shift a cluster while keeping the spacing inside it, use translate_objects, which takes one delta for all of them.",
			"All or nothing: if one entry is rejected nothing moves at all, and the error names the entry that failed — so the drawing is never left half re-laid-out.",
		].join(" "),
		{
			entries: z
				.array(
					z.object({
						id: z.string().describe("id of the object to move."),
						x: z.number().optional().describe("New top-left x in px."),
						y: z.number().optional().describe("New top-left y in px."),
					}),
				)
				.min(1)
				.describe("Where each object goes, one entry per object."),
		},
		(args) => ({ kind: "setPositions", ...args }),
		{ drives: ["docOps.setPositions"] },
	);

	const translateObjectsTool = defineCanvasTool(
		"translate_objects",
		"Shift several objects by the same amount, keeping the layout between them. Use this to open up room for something new instead of re-placing every shape.",
		{
			ids: z.array(z.string()).min(1).describe("ids to shift."),
			deltaX: z.number().describe("Px to move right; negative moves left."),
			deltaY: z.number().describe("Px to move down; negative moves up."),
		},
		(args) => ({ kind: "translateObjects", ...args }),
		{ drives: ["docOps.translateObjects"] },
	);

	const resizeObjectTool = defineCanvasTool(
		"resize_object",
		"Resize one object, keeping its top-left corner. Give at least one of width / height. A group scales its children with it.",
		{
			id: z.string().describe("id of the object to resize."),
			width: z.number().min(1).optional().describe("New width in px."),
			height: z.number().min(1).optional().describe("New height in px."),
		},
		(args) => ({ kind: "resizeObject", ...args }),
		{ drives: ["docOps.resizeObject"] },
	);

	const resizeObjectsTool = defineCanvasTool(
		"resize_objects",
		[
			"Give many objects one and the same size, each keeping its own top-left corner — how a row of boxes is evened up to a common width.",
			"Its arguments are shaped unlike the other batch tools: one ids list and one width / height for all of them, the way set_style hands one style to every id. There is no size per object here; for that, call resize_object per object.",
			"An omitted axis keeps each object's current extent, so passing width alone leaves the heights as varied as they were.",
			"A group scales its children with it, as in resize_object.",
			"All or nothing: if one id is rejected — missing, or an object with no size of its own — nothing is resized at all, and the error names the id that failed.",
		].join(" "),
		{
			ids: z.array(z.string()).min(1).describe("ids to resize to one size."),
			width: z
				.number()
				.min(1)
				.optional()
				.describe(
					"New width in px, shared by every id; omit to keep each object's own width.",
				),
			height: z
				.number()
				.min(1)
				.optional()
				.describe(
					"New height in px, shared by every id; omit to keep each object's own height.",
				),
		},
		(args) => ({ kind: "resizeObjects", ...args }),
		{ drives: ["docOps.resizeObjects"] },
	);

	const setRotationTool = defineCanvasTool(
		"set_rotation",
		[
			"Turn objects, clockwise in degrees about each one's own centre.",
			"The angle is absolute, not a step: 90 twice in a row still leaves the object at 90, and 0 stands it upright again.",
			"Types built from vertices (polygon, polyline) and connectors do not turn; they are skipped and the result names them, so read it before assuming something moved.",
			"This is how an arrow, a triangle or a chevron is made to point elsewhere — never stand in a character like ▲ for a turned shape.",
		].join(" "),
		{
			ids: z.array(z.string()).min(1).describe("ids to turn."),
			rotation: z
				.number()
				.describe(
					"Clockwise degrees; 0 is upright, and -90 and 270 are the same angle.",
				),
		},
		(args) => ({ kind: "setRotation", ...args }),
		{ drives: ["docOps.setRotation"] },
	);

	const setPointsTool = defineCanvasTool(
		"set_points",
		[
			"Rewrite the vertices of one polygon or polyline. A poly shape has no x / y / width / height of its own, so this is how it is moved, resized and reshaped alike.",
			"Coordinates are world coordinates, in drawing order, and the whole outline is replaced at once — there is no way to nudge one vertex, so send the vertices you want to keep along with the ones you change.",
			"A polygon closes itself, so never repeat the first vertex; it needs 3 vertices, a polyline 2.",
			"A connector's points are its route rather than its shape: use update_connector for those.",
		].join(" "),
		{
			id: z.string().describe("id of the polygon or polyline to reshape."),
			points: z
				.array(pointSchema)
				.min(2)
				.describe("The whole new outline, in drawing order."),
		},
		(args) => ({ kind: "setPoints", ...args }),
		{ drives: ["docOps.setPoints"] },
	);

	const setPointsManyTool = defineCanvasTool(
		"set_points_many",
		[
			"Rewrite the outlines of many polygons and polylines at once: the batch form of set_points, each entry giving one shape's whole new outline.",
			"A poly shape has no x / y / width / height of its own, so this moves, resizes and reshapes every one of them together — which is what you want after recomputing a set of shapes, a chart's series or a fan of arrows.",
			"Each entry follows set_points exactly: world coordinates in drawing order, the whole outline at once, a polygon closing itself (3 vertices, never repeating the first) and a polyline needing 2.",
			"All or nothing: if one entry is rejected nothing is reshaped at all, and the error names the entry that failed, so the drawing never ends up with half the new geometry.",
		].join(" "),
		{
			entries: z
				.array(
					z.object({
						id: z
							.string()
							.describe("id of the polygon or polyline to reshape."),
						points: z
							.array(pointSchema)
							.min(2)
							.describe("The whole new outline, in drawing order."),
					}),
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
			"Restack objects. Creation order is drawing order, so whatever was added last sits on top; this is how you change that afterwards.",
			"When a fill hides a line, a marker or a label, send the fill to the back or bring what it covers to the front — never delete the drawing and rebuild it in another order.",
			"Objects are restacked inside the parent that holds them, so a group's children move among their siblings and never leave the group, and objects moved together keep their order relative to each other.",
		].join(" "),
		{
			ids: z
				.array(z.string())
				.min(1)
				.describe("ids to restack; the order you list them in means nothing."),
			placement: z
				.enum(Z_ORDER_PLACEMENTS)
				.describe(
					'Where to take them: "front" / "back" go the whole way, "forward" / "backward" move one step past the nearest object that is not itself moving.',
				),
		},
		(args) => ({ kind: "reorderObjects", ...args }),
		{ drives: ["docOps.reorderObjects"] },
	);

	const setStyleTool = defineCanvasTool(
		"set_style",
		"Restyle existing objects. Pass several ids to color a whole group of shapes in one call. Properties a type has no place for are skipped, and the result says which — read it before assuming a color was applied.",
		{
			ids: z.array(z.string()).min(1).describe("ids to restyle."),
			...styleSchema,
		},
		({ ids, ...style }) => ({ kind: "setStyle", ids, style }),
		{ drives: ["docOps.setStyle"] },
	);

	const setExtraPropsTool = defineCanvasTool(
		"set_extra_props",
		[
			"Set the properties belonging to a shape type itself: lucideIcon's `icon`, callout's `tail`, container's `headerFill` / `headerHeight`.",
			"One object at a time, because these names belong to a single type — read the type's own schema for the names it has.",
			"Unlike set_style nothing is silently skipped: a name the type does not have, or a value it rejects, comes back as an error with the reason, and the object is left as it was.",
		].join(" "),
		{
			id: z.string().describe("id of the object to change."),
			extraProps: z
				.record(z.string(), z.unknown())
				.describe(
					"Property names and values to set. Only the names the type declares are accepted; the geometry, the text and the styling have their own tools.",
				),
		},
		({ id, extraProps }) => ({ kind: "setExtraProps", id, extraProps }),
		{ drives: ["docOps.setExtraProps"] },
	);

	const setTextTool = defineCanvasTool(
		"set_text",
		'Rewrite an object\'s text. On a shape it replaces the label; on a connector it sets the text drawn on the line, and "" removes it. Always prefer this over adding a second shape next to the first one.',
		{
			id: z.string().describe("id of the object to retext."),
			text: z
				.string()
				.describe('The new text; "" clears it (and drops a connector label).'),
			slot: z
				.string()
				.optional()
				.describe(
					'For shapes that keep several named texts (record: "name" / "attributes" / "operations"), which one to write. The slot must already exist — describe_canvas shows them.',
				),
		},
		(args) => ({ kind: "setText", ...args }),
		{ drives: ["docOps.setText"] },
	);

	const setTextsTool = defineCanvasTool(
		"set_texts",
		[
			"Rewrite the text of many objects in one call: the batch form of set_text, each entry taking the same id, text and optional slot.",
			"This is how a whole diagram's labels are filled in — add_objects for the shapes, then one call here for every label — and how a set of wordings is corrected together rather than one call per shape.",
			'Each entry reads exactly as set_text does: on a connector the text is the label drawn on the line, and "" clears it.',
			"All or nothing: if one entry is rejected nothing is rewritten at all, and the error names the entry that failed, so the diagram is never left with half its labels changed.",
		].join(" "),
		{
			entries: z
				.array(
					z.object({
						id: z.string().describe("id of the object to retext."),
						text: z
							.string()
							.describe(
								'The new text; "" clears it (and drops a connector label).',
							),
						slot: z
							.string()
							.optional()
							.describe(
								'For shapes that keep several named texts (record: "name" / "attributes" / "operations"), which one to write. The slot must already exist.',
							),
					}),
				)
				.min(1)
				.describe("One text per object, written in the order given."),
		},
		(args) => ({ kind: "setTexts", ...args }),
		{ drives: ["docOps.setTexts"] },
	);

	const setTextStyleTool = defineCanvasTool(
		"set_text_style",
		[
			"Decorate part of one object's text — a few words in bold, one term in another color, a phrase struck through — leaving the rest of the body as it was.",
			"This is the only tool that reaches inside a text. set_style is the other side of that line: it styles the whole object, so its fontColor / fontSize reach every character, and applying it afterwards overrides what you set here.",
			"The stretch is named by the characters themselves (match), never by an offset; occurrence picks which one when the text holds several, and omitting it decorates every occurrence.",
			"Only typography a run of characters carries on its own is settable: fontColor, fontSize, fontFamily, fontWeight, fontStyle, textDecoration. textAlign and verticalAlign place the whole body and belong to set_style.",
			"Fails when match does not occur in the text, and on text that can only be styled as a whole (a connector label, a slot holding rows) — use set_style there.",
		].join(" "),
		{
			id: z.string().describe("id of the object whose text is decorated."),
			...textStretchSchema,
			...inlineTextStyleSchema,
		},
		(args) => ({ kind: "setTextStyle", ...args }),
		{ drives: ["docOps.setInlineTextStyle"] },
	);

	const setTextStylesTool = defineCanvasTool(
		"set_text_styles",
		[
			"Decorate stretches of text on many objects in one call: the batch form of set_text_style, each entry naming one object, the characters to match and the typography to lay over them.",
			"Repeat an id to decorate several stretches of the same text — that is how one paragraph gets a term in bold and another in color — and the entries stack in the order given.",
			"The same line holds as in set_text_style: only fontColor / fontSize / fontFamily / fontWeight / fontStyle / textDecoration, never alignment, and a later set_style on the whole object overrides all of it.",
			"All or nothing: every match is looked for before anything is decorated, so one entry whose text does not contain its match leaves the whole call unapplied, and the error names that entry.",
		].join(" "),
		{
			entries: z
				.array(
					z.object({
						id: z
							.string()
							.describe("id of the object whose text is decorated."),
						...textStretchSchema,
						...inlineTextStyleSchema,
					}),
				)
				.min(1)
				.describe("One stretch per entry, decorated in the order given."),
		},
		(args) => ({ kind: "setTextStyles", ...args }),
		{ drives: ["docOps.setInlineTextStyles"] },
	);

	const updateConnectorTool = defineCanvasTool(
		"update_connector",
		[
			"Change an existing connector: where each end attaches, how the line is routed, its arrowheads, and where its label sits.",
			"An end can also be lifted off its object onto a bare coordinate (sourcePoint / targetPoint), as long as the other end stays attached.",
			"This is how you fix a line that cuts through a shape — pin both ends to the edges that face each other, or give the corners yourself through points.",
			"A non-empty points list is the path, so nothing is routed around any more; pass [] to hand the route back to the engine.",
			'It is also how you reshape a free path: with routing "straight", rewrite points instead of deleting the line and drawing it again.',
		].join(" "),
		{
			id: z.string().describe("id of the connector to change."),
			...connectorChangeSchema,
		},
		(args) => ({ kind: "updateConnector", ...args }),
		{ drives: ["docOps.updateConnector"] },
	);

	const updateConnectorsTool = defineCanvasTool(
		"update_connectors",
		[
			"Change many connectors in one call: the batch form of update_connector, each entry taking exactly what it takes — endpoints, anchors, arrowheads, routing, corners and label placement.",
			"Reach for it when one move breaks a whole fan of lines: re-anchor every edge into the side that now faces the shape, or give a set of edges the same arrowhead, in one call and one undo step.",
			"An id may appear only once. Put every change to one connector in a single entry, since two entries would each be checked against the connector as it was before the call.",
			"All or nothing: if one entry is rejected nothing is changed at all, and the error names the entry that failed, so a batch can never leave half the lines re-attached.",
		].join(" "),
		{
			entries: z
				.array(
					z.object({
						id: z.string().describe("id of the connector to change."),
						...connectorChangeSchema,
					}),
				)
				.min(1)
				.describe("The connectors to change, one entry each."),
		},
		(args) => ({ kind: "updateConnectors", ...args }),
		{ drives: ["docOps.updateConnectors"] },
	);

	const alignObjectsTool = defineCanvasTool(
		"align_objects",
		"Line objects up on one edge of the box they occupy together. Only the axis of that edge moves, and the group as a whole stays where it is.",
		{
			ids: z.array(z.string()).min(2).describe("ids to align."),
			edge: z
				.enum(ALIGN_EDGES)
				.describe(
					"Edge or midline to line up on: left / centerX / right move along x, top / centerY / bottom along y.",
				),
		},
		(args) => ({ kind: "alignObjects", ...args }),
		{ drives: ["docOps.alignObjects"] },
	);

	const distributeObjectsTool = defineCanvasTool(
		"distribute_objects",
		"Spread objects along one axis with equal gaps, keeping the first one in place. Without spacing the outermost two stay put and everything between them is evened out (needs 3+ objects); with spacing every gap becomes exactly that many px.",
		{
			ids: z.array(z.string()).min(2).describe("ids to spread."),
			axis: z
				.enum(DISTRIBUTE_AXES)
				.describe("Axis to spread along; the other axis is left alone."),
			spacing: z
				.number()
				.optional()
				.describe(
					"Gap between neighbours in px; omit to even out the space they already occupy.",
				),
		},
		(args) => ({ kind: "distributeObjects", ...args }),
		{ drives: ["docOps.distributeObjects"] },
	);

	const groupObjectsTool = defineCanvasTool(
		"group_objects",
		"Wrap objects in a group so the user can move them as one. They must sit next to each other in the document (not already inside different groups). Connectors cannot be grouped — they follow the objects they join anyway.",
		{
			ids: z.array(z.string()).min(2).describe("ids to group."),
		},
		(args) => ({ kind: "groupObjects", ...args }),
		{ drives: ["docOps.groupObjects"] },
	);

	const dissolveGroupTool = defineCanvasTool(
		"dissolve_group",
		"Dissolve a group, leaving its children in place as independent objects.",
		{
			id: z.string().describe("id of the group to dissolve."),
		},
		(args) => ({ kind: "dissolveGroup", ...args }),
		{ drives: ["docOps.dissolveGroup"] },
	);

	const dissolveGroupsTool = defineCanvasTool(
		"dissolve_groups",
		[
			"Dissolve many groups at once: the batch form of dissolve_group, every group leaving its children in place as independent objects.",
			"Use it to flatten a whole grouping before re-organizing the drawing, instead of a dissolve_group per group.",
			"A group and a group nested inside it may be named together, in either order: both levels end up gone and the children keep their drawing order.",
			"All or nothing: if one id is rejected — missing, not a group, or a rotated group — nothing is dissolved at all, and the error names the id that failed.",
			"Returns the ids released, which are the objects you now address one by one.",
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
		"Move objects that already exist into an existing group, so a cluster can grow without being taken apart and rebuilt. Nothing on the canvas moves — only what the group holds. A group the move empties is dropped, and connectors cannot join a group (they follow the objects they join anyway).",
		{
			groupId: z.string().describe("id of the group to move them into."),
			ids: z
				.array(z.string())
				.min(1)
				.describe("ids to move in; they end up drawn on top of the group."),
		},
		(args) => ({ kind: "addToGroup", ...args }),
		{ drives: ["docOps.addObjectsToGroup"] },
	);

	const removeFromGroupTool = defineCanvasTool(
		"remove_from_group",
		"Take objects out of the group holding them, leaving them on the canvas where they are. Use this to release one member; dissolve_group dissolves the whole group. Taking the last member out drops the group.",
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
			"See the canvas as a picture: renders the whole drawing to a PNG and hands it back to you.",
			"Use it to judge what only the eye catches — a line crossing a shape, overlapping objects, a label spilling out of its box, a lopsided layout — after finishing a drawing or a batch of edits, and fix what you see.",
			"The image is fitted to the content and scaled down, so never read coordinates or sizes off it; describe_canvas is where the exact numbers are.",
		].join(" "),
		{},
		() => ({ kind: "captureCanvas" }),
		{ isReadOnly: true, drives: ["handle.export.capturePng"] },
	);

	// The measurement tools below answer with numbers what capture_canvas can only
	// hint at in a picture.

	const measureTextTool = defineCanvasTool(
		"measure_text",
		[
			"Measure how one label actually came out: the box it is drawn in, the size the wrapped text takes, how many lines it wrapped to, and whether the shape is cutting it off.",
			'This is the exact answer to "does the label fit?" that capture_canvas can only suggest — call it after putting text on a shape you did not size for it, instead of judging the fit from a picture.',
			"describe_canvas cannot answer it either: the document holds the text and the shape size, not the wrapping between them.",
			"When the text does not fit, the result says how much room is missing, so you can resize_object, drop the fontSize or shorten the text by a known amount.",
		].join(" "),
		{
			id: z.string().describe("id of the object whose label is measured."),
			slot: z
				.string()
				.optional()
				.describe(
					'For shapes that keep several named texts (record: "name" / "attributes" / "operations"), which one to measure. Omit for the shape\'s single label.',
				),
		},
		(args) => ({ kind: "measureText", ...args }),
		{ isReadOnly: true, drives: ["handle.measure.textSlot"] },
	);

	const findOverlapsTool = defineCanvasTool(
		"find_overlaps",
		[
			"List the shapes sitting on top of one another, with the rectangle each pair shares and how big it is.",
			"This is the numeric form of the overlap check you would otherwise make by eye on capture_canvas: call it after add_objects and after moving things about, and trust it over the picture.",
			"Shapes are compared by bounding box, so a pair whose drawn outlines only come close is still reported; a pair where one fully contains the other is marked as such, since that is usually deliberate.",
			"Connectors and groups are never compared — a line crossing a shape is how connectors are drawn.",
			"An empty result means the layout is clean, not that the call failed.",
		].join(" "),
		{
			ids: z
				.array(z.string())
				.optional()
				.describe(
					"Shapes to compare; omit to compare everything on the canvas, which is what you want after a batch of edits.",
				),
		},
		(args) => ({ kind: "findOverlaps", ...args }),
		{ isReadOnly: true, drives: ["handle.measure.findOverlaps"] },
	);

	const measureConnectorPathTool = defineCanvasTool(
		"measure_connector_path",
		[
			"Trace where a connector is really drawn: both endpoints as they landed on the shapes' outlines, and every corner the router put in between.",
			"The document stores neither — an end is an anchor reference and a route is computed at draw time — so this is the only way to know a line's actual path short of looking at a capture_canvas picture.",
			"Use it when you suspect a line cuts through a shape: compare the returned points against the boxes describe_canvas reports, then re-route it with update_connector.",
		].join(" "),
		{
			id: z.string().describe("id of the connector to trace."),
		},
		(args) => ({ kind: "measureConnectorPath", ...args }),
		{ isReadOnly: true, drives: ["handle.measure.connectorPath"] },
	);

	const measureVisualBoundsTool = defineCanvasTool(
		"measure_visual_bounds",
		[
			"Measure the rectangle objects really cover once drawn, decoration outside their geometry included (an actor's label, a shadow).",
			"describe_canvas reports the boxes you asked for; this reports what came of them, which is what actually collides with a neighbour and what fit_view frames.",
			"Use it to place something beside existing work without guessing the gap off a capture_canvas picture: measure what is there, then set_position past its edge.",
			"The result is a single rectangle, the union of everything named, so measure ids one at a time when you need them apart.",
		].join(" "),
		{
			ids: z
				.array(z.string())
				.min(1)
				.describe("ids to measure together; the union is what comes back."),
		},
		(args) => ({ kind: "measureVisualBounds", ...args }),
		{ isReadOnly: true, drives: ["handle.measure.visualBounds"] },
	);

	const hitTestTool = defineCanvasTool(
		"hit_test",
		[
			"Ask what is drawn at a world position: the objects under a point, or every object reaching into a rect, front-most first — so the first id is what a click there would land on.",
			"This is how a coordinate becomes ids. Check whether the spot you are about to place a shape at is already taken, or name the objects sitting inside a region you measured, without reading the whole drawing.",
			"A point is tested against the outline a shape is really drawn with, so an ellipse is not hit at the corner of its box and a connector is hit only near its line. A rect is matched against bounding boxes instead, so it collects everything whose box reaches into it.",
			"Groups are never named; their members are tested one by one.",
			"Coordinates come from the drawing itself — describe_canvas, get_object_bounds, measure_visual_bounds — and never from a capture_canvas picture, which is scaled and says nothing exact.",
			"Nothing at that spot is an answer, not a failure.",
		].join(" "),
		{
			point: pointSchema
				.optional()
				.describe(
					"World point to test. Give this or rect, not both and not neither.",
				),
			rect: rectSchema
				.optional()
				.describe(
					"World rect to collect everything reaching into. Give this or point, not both and not neither.",
				),
			tolerance: z
				.number()
				.min(0)
				.optional()
				.describe(
					"How far beyond its line a connector or polyline still counts as hit, in world px; omit for the canvas default of 4. Shapes with an area ignore it, being hit inside their outline and nowhere else.",
				),
		},
		(args) => ({ kind: "hitTest", ...args }),
		{ isReadOnly: true, drives: ["handle.measure.hitTest"] },
	);

	const getSelectionTool = defineCanvasTool(
		"get_selection",
		[
			"Read which objects the user has selected right now.",
			'This is the way to find out what they mean by "this" or "these": read the selection before acting on a request that points at something without naming it, rather than guessing which shape they had in mind.',
			"select_objects is the other direction — it sets the selection so the user sees which objects you are talking about.",
			"An empty selection is an answer, not a failure.",
		].join(" "),
		{},
		() => ({ kind: "getSelection" }),
		{ isReadOnly: true, drives: ["handle.selection.getSelectedIds"] },
	);

	const getViewTool = defineCanvasTool(
		"get_view",
		[
			"Read the view as it stands: where the camera's top-left corner sits in world coordinates, how far it is zoomed in, how large the drawing area is in screen px, and which rectangle of the world is on screen because of all that.",
			"That rectangle is where the user is looking, so something added inside it lands in front of them and something added outside it is off screen until you take them there.",
			"It is also the read side of set_view: read the three camera numbers here, show the user another part of the drawing, then hand the same numbers back to set_view to put them back where they were.",
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
			"Read what the user is doing to the canvas at this instant: whether a drag is under way, which object's text they have open in the editor, whether the view is still coasting from a pan, which drawing tool is armed, and whether a dialog is open.",
			"Two of those change what you should do. The object being edited is one the user is typing in right now, so leave its text alone — never set_text over what they are writing. A drag in progress means a pointer is down, which is why an edit of yours may have been refused or wiped out a moment later; wait for it to end instead of calling again.",
			"It is a snapshot of the moment rather than a live value, so read it again rather than trusting an old answer.",
		].join(" "),
		{},
		() => ({ kind: "getInteractionStatus" }),
		{ isReadOnly: true, drives: ["handle.interaction.getStatus"] },
	);

	const toSvgTool = defineCanvasTool(
		"to_svg",
		[
			"Read the canvas as an SVG string: the markup it is really drawn with, elements, paths and transforms included.",
			"Reach for it only when the markup itself is the question — quoting the SVG to the user, or checking how something ended up rendered. To see what the drawing looks like use capture_canvas, which shows it as a picture and is what a layout is judged by; for the objects and their numbers use describe_canvas, list_objects and get_object.",
			`The markup is cut off past ${MAX_SVG_CHARS.toLocaleString("en-US")} characters and the rest cannot be reached through this tool at all, so on anything but a small drawing expect the beginning only.`,
		].join(" "),
		{},
		() => ({ kind: "toSvg" }),
		{ isReadOnly: true, drives: ["handle.export.toSvgString"] },
	);

	const toWorldTool = defineCanvasTool(
		"to_world",
		[
			"Convert a client coordinate — the space a browser pointer event reports, measured from the top-left corner of the window — into the world coordinate the canvas draws in.",
			"You will normally have no use for this. Every coordinate the other tools give you and take from you is already a world coordinate, and nothing hands you a client one; it is here for the rare case where a position was read off the page itself, such as a screen position the user quotes at you.",
			"Fails while the canvas has not finished mounting, since there is no coordinate system to convert through yet.",
		].join(" "),
		{
			x: z
				.number()
				.describe("Client x in px, from the left edge of the window."),
			y: z
				.number()
				.describe("Client y in px, from the top edge of the window."),
		},
		(args) => ({ kind: "toWorld", ...args }),
		{ isReadOnly: true, drives: ["handle.viewport.toWorld"] },
	);

	const toClientTool = defineCanvasTool(
		"to_client",
		[
			"The inverse of to_world: where a world coordinate currently sits on the user's screen, in the client space a browser pointer event reports.",
			"As with to_world you will normally have no use for it — it answers where something is on screen, which matters to code putting its own overlay over the canvas rather than to drawing on the canvas. The answer also moves with every pan and zoom, so it is only true for the instant it was read.",
			"Fails while the canvas has not finished mounting, since there is no coordinate system to convert through yet.",
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
			"Select objects on the canvas, the way a user would click them — this is what you use to point at something while you talk about it.",
			'The selection is also what fit_view("selection") frames, so select first and fit second to zoom the user in on one part of the drawing.',
			"A connector can only be selected on its own; asked for together with anything else it is left out, and the result says so.",
		].join(" "),
		{
			ids: z
				.array(z.string())
				.describe("ids to select; an empty list clears the selection."),
		},
		(args) => ({ kind: "selectObjects", ...args }),
		{ drives: ["handle.selection.select"] },
	);

	const centerViewTool = defineCanvasTool(
		"center_view",
		[
			"Move the view so a world position sits in the middle of the screen — this is how you take the user to a specific spot.",
			"Coordinates are the same ones describe_canvas reports, so read the object you want to show and pass its center.",
			"Only what the user sees changes; nothing on the canvas moves.",
		].join(" "),
		{
			x: z.number().describe("World x to put at the center of the view."),
			y: z.number().describe("World y to put at the center of the view."),
			zoom: z
				.number()
				.min(0.1)
				.max(10)
				.optional()
				.describe(
					"Zoom factor: 1 is 100%, 2 doubles the size on screen. Omit to keep the current zoom.",
				),
		},
		(args) => ({ kind: "centerView", ...args }),
		{ drives: ["handle.viewport.centerOn"] },
	);

	const setViewTool = defineCanvasTool(
		"set_view",
		[
			"Put the view exactly where you say: the world coordinate of its top-left corner and the zoom factor, which are the same three numbers get_view reports.",
			"Its one everyday use is putting the user back: read the view with get_view before you take them somewhere, show what you wanted to show, then hand those numbers back here.",
			"To bring a position into view without working the corner out yourself use center_view, and to frame a region use fit_view — both of them compute this camera for you.",
			"Only what the user sees changes; nothing on the canvas moves.",
		].join(" "),
		{
			minX: z
				.number()
				.describe(
					"World x of the view's top-left corner, as get_view reports.",
				),
			minY: z
				.number()
				.describe(
					"World y of the view's top-left corner, as get_view reports.",
				),
			zoom: z
				.number()
				.min(0.1)
				.max(10)
				.describe(
					"Zoom factor: 1 is 100%, 2 doubles the size on screen. Required — there is no 'keep the current zoom' here, so read it with get_view first.",
				),
		},
		(args) => ({ kind: "setView", ...args }),
		{ drives: ["handle.viewport.setViewport"] },
	);

	const fitViewTool = defineCanvasTool(
		"fit_view",
		[
			'Frame the whole drawing ("all"), just what is selected ("selection"), or a world rect you name in the view.',
			"Use it after drawing so the user sees everything you made, and after select_objects to zoom in on one part.",
			"A rect is for a region you worked out yourself — the bounds measure_visual_bounds reported, the area around one node — and is fitted the same way the other two are.",
			"Give exactly one of target and rect.",
			"A rect is what the view is fitted around rather than what it ends up showing: the window's proportions decide how much extra comes into view on one axis, and get_view reads back what is really on screen.",
			"Fails when there is nothing to frame: an empty canvas, an empty selection, or a rect with no extent on either axis.",
		].join(" "),
		{
			target: z
				.enum(["all", "selection"])
				.optional()
				.describe("What to fit into the view; omit when giving rect instead."),
			rect: rectSchema
				.optional()
				.describe(
					"World rect to frame; omit when giving target instead. A rect flat on one axis still fits along the other.",
				),
		},
		(args) => ({ kind: "fitView", ...args }),
		{
			drives: [
				"handle.viewport.fitToContent",
				"handle.viewport.fitToSelection",
				"handle.viewport.fitToRect",
			],
		},
	);

	const undoTool = defineCanvasTool(
		"undo",
		"Take back your own last canvas change. Refused once the user has edited the canvas themselves, so it can never discard their work — fix things forward in that case.",
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
		toSvgTool,
		toWorldTool,
		toClientTool,
		addObjectTool,
		addObjectsTool,
		connectTool,
		connectManyTool,
		deleteObjectsTool,
		setPositionTool,
		setPositionsTool,
		translateObjectsTool,
		resizeObjectTool,
		resizeObjectsTool,
		setRotationTool,
		setPointsTool,
		setPointsManyTool,
		reorderObjectsTool,
		setStyleTool,
		setExtraPropsTool,
		setTextTool,
		setTextsTool,
		setTextStyleTool,
		setTextStylesTool,
		updateConnectorTool,
		updateConnectorsTool,
		alignObjectsTool,
		distributeObjectsTool,
		groupObjectsTool,
		dissolveGroupTool,
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
