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
 * Properties a type has no place for (fill on a connector, a font colour on a
 * shape without text) are dropped by docOps, which says so in the tool result.
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
		"Read the current canvas document. Returns the CanvasDoc JSON, including every object's id, type, position, size and style. Call this before adding or editing anything so you know what already exists, what its ids are, and where the free space is.",
		{},
		() => ({ kind: "describeCanvas" }),
		// The host serializes the document it already holds; no doc-ops read is involved
		{ isReadOnly: true, drives: ["agent"] },
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
				"docOps.addObject",
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
		{
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
				.describe(
					"Arrowhead at the target end (use FilledTriangle for a flow).",
				),
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
		},
		(args) => ({ kind: "connect", ...args }),
		{ drives: ["docOps.connect"] },
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
		},
		(args) => ({ kind: "updateConnector", ...args }),
		{ drives: ["docOps.updateConnector"] },
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

	const fitViewTool = defineCanvasTool(
		"fit_view",
		[
			'Frame the whole drawing ("all") or just what is selected ("selection") in the view.',
			"Use it after drawing so the user sees everything you made, and after select_objects to zoom in on one part.",
			"Fails when there is nothing to frame: an empty canvas, or an empty selection.",
		].join(" "),
		{
			target: z
				.enum(["all", "selection"])
				.describe("What to fit into the view."),
		},
		(args) => ({ kind: "fitView", ...args }),
		{
			drives: [
				"handle.viewport.fitToContent",
				"handle.viewport.fitToSelection",
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
		captureCanvasTool,
		addObjectTool,
		addObjectsTool,
		connectTool,
		deleteObjectsTool,
		setPositionTool,
		translateObjectsTool,
		resizeObjectTool,
		setRotationTool,
		setPointsTool,
		reorderObjectsTool,
		setStyleTool,
		setTextTool,
		updateConnectorTool,
		alignObjectsTool,
		distributeObjectsTool,
		groupObjectsTool,
		dissolveGroupTool,
		addToGroupTool,
		removeFromGroupTool,
		selectObjectsTool,
		centerViewTool,
		fitViewTool,
		undoTool,
	];
};
