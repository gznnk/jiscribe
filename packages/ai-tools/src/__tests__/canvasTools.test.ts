import { describe, expect, it } from "vitest";
import { z } from "zod";

import { createCanvasToolDescriptors } from "../canvasTools";
import type { CanvasToolDescriptor } from "../canvasTools";
import type { AiCanvasCapabilities } from "../capabilities";

const capabilities: AiCanvasCapabilities = {
	creatableObjectTypes: ["rect", "ellipse", "diamond"],
	connectableObjectTypes: ["rect", "ellipse"],
};

const findDescriptor = (
	descriptors: readonly CanvasToolDescriptor[],
	name: string,
): CanvasToolDescriptor => {
	const found = descriptors.find((descriptor) => descriptor.name === name);
	expect(found, `tool ${name} should exist`).toBeDefined();
	return found as CanvasToolDescriptor;
};

describe("createCanvasToolDescriptors", () => {
	it("declares the whole canvas tool set, with unique names", () => {
		const names = createCanvasToolDescriptors(capabilities).map(
			(descriptor) => descriptor.name,
		);

		// The entire surface the AI sees. Drop one only on purpose
		expect(names).toEqual([
			"describe_canvas",
			"list_objects",
			"find_objects",
			"get_object",
			"get_object_bounds",
			"get_combined_bounds",
			"get_text",
			"get_z_order",
			"get_parent_group",
			"get_group_members",
			"get_connectors",
			"get_connected_objects",
			"list_types",
			"capture_canvas",
			"measure_text",
			"find_overlaps",
			"measure_connector_path",
			"measure_visual_bounds",
			"hit_test",
			"get_selection",
			"get_view",
			"get_interaction_status",
			"to_svg",
			"to_world",
			"to_client",
			"add_object",
			"add_objects",
			"connect",
			"connect_many",
			"delete_objects",
			"set_position",
			"set_positions",
			"translate_objects",
			"resize_object",
			"resize_objects",
			"set_height_mode",
			"set_rotation",
			"set_points",
			"set_points_many",
			"reorder_objects",
			"set_style",
			"set_background",
			"set_document_view",
			"set_meta",
			"set_extra_props",
			"set_text",
			"set_texts",
			"set_text_style",
			"set_text_styles",
			"update_connector",
			"update_connectors",
			"align_objects",
			"distribute_objects",
			"group_objects",
			"dissolve_group",
			"dissolve_groups",
			"add_to_group",
			"remove_from_group",
			"select_objects",
			"center_view",
			"set_view",
			"fit_view",
			"undo",
		]);
		expect(new Set(names).size).toBe(names.length);
	});

	it("marks only the reading tools read-only", () => {
		const readOnlyNames = createCanvasToolDescriptors(capabilities)
			.filter((descriptor) => descriptor.isReadOnly)
			.map((descriptor) => descriptor.name);

		expect(readOnlyNames).toEqual([
			"describe_canvas",
			"list_objects",
			"find_objects",
			"get_object",
			"get_object_bounds",
			"get_combined_bounds",
			"get_text",
			"get_z_order",
			"get_parent_group",
			"get_group_members",
			"get_connectors",
			"get_connected_objects",
			"list_types",
			"capture_canvas",
			"measure_text",
			"find_overlaps",
			"measure_connector_path",
			"measure_visual_bounds",
			"hit_test",
			"get_selection",
			"get_view",
			"get_interaction_status",
			"to_svg",
			"to_world",
			"to_client",
		]);
	});

	it("turns every input schema into a JSON Schema, which is what the direct API route needs", () => {
		for (const descriptor of createCanvasToolDescriptors(capabilities)) {
			expect(() =>
				z.toJSONSchema(z.object(descriptor.inputSchema)),
			).not.toThrow();
		}

		const addObjectJsonSchema = z.toJSONSchema(
			z.object(
				findDescriptor(createCanvasToolDescriptors(capabilities), "add_object")
					.inputSchema,
			),
		);

		expect(addObjectJsonSchema).toMatchObject({
			type: "object",
			required: ["type", "x", "y"],
		});
	});

	it("accepts only the shape types it was given as the add_object type", () => {
		const descriptors = createCanvasToolDescriptors(capabilities);

		const typeSchema = findDescriptor(descriptors, "add_object").inputSchema
			.type;

		expect(z.safeParse(typeSchema, "diamond").success).toBe(true);
		expect(z.safeParse(typeSchema, "unknown-shape").success).toBe(false);
	});

	it("falls back to a free string when no type list arrived (docOps reports the mistake)", () => {
		const descriptors = createCanvasToolDescriptors(null);

		const typeSchema = findDescriptor(descriptors, "add_object").inputSchema
			.type;

		expect(z.safeParse(typeSchema, "unknown-shape").success).toBe(true);
	});

	it("names the connectable types in the connect description", () => {
		const withTypes = findDescriptor(
			createCanvasToolDescriptors(capabilities),
			"connect",
		).description;
		const withoutTypes = findDescriptor(
			createCanvasToolDescriptors(null),
			"connect",
		).description;

		expect(withTypes).toContain("Connectable types: rect, ellipse.");
		expect(withoutTypes).not.toContain("Connectable types");
	});

	it("takes any non-empty anchor id on every connector tool, leaving the check to docOps", () => {
		const descriptors = createCanvasToolDescriptors(capabilities);
		const parse = (name: string, args: unknown) =>
			z.safeParse(z.object(findDescriptor(descriptors, name).inputSchema), args)
				.success;
		const anchors = { sourceAnchor: "col:1:left", targetAnchor: "col:0:right" };

		expect(parse("connect", { sourceId: "a", targetId: "b", ...anchors })).toBe(
			true,
		);
		expect(
			parse("connect_many", {
				entries: [{ sourceId: "a", targetId: "b", ...anchors }],
			}),
		).toBe(true);
		expect(parse("update_connector", { id: "c", ...anchors })).toBe(true);
		expect(
			parse("update_connectors", { entries: [{ id: "c", ...anchors }] }),
		).toBe(true);
		expect(
			parse("connect", { sourceId: "a", targetId: "b", sourceAnchor: "" }),
		).toBe(false);
	});

	it("takes poly vertices and a rotation on add_object", () => {
		const descriptors = createCanvasToolDescriptors(capabilities);

		const { points, rotation } = findDescriptor(
			descriptors,
			"add_object",
		).inputSchema;

		expect(
			z.safeParse(points, [
				{ x: 0, y: 0 },
				{ x: 40, y: 0 },
				{ x: 20, y: 40 },
			]).success,
		).toBe(true);
		// One vertex is not a shape
		expect(z.safeParse(points, [{ x: 0, y: 0 }]).success).toBe(false);
		expect(z.safeParse(rotation, 90).success).toBe(true);
	});

	it("lets one end of connect be a bare coordinate (an id is not required)", () => {
		const descriptors = createCanvasToolDescriptors(capabilities);

		const { sourceId, sourcePoint } = findDescriptor(
			descriptors,
			"connect",
		).inputSchema;

		expect(z.safeParse(sourceId, undefined).success).toBe(true);
		expect(z.safeParse(sourcePoint, { x: 10, y: 20 }).success).toBe(true);
	});

	it("takes one type or several on find_objects, and a whole rect to search inside", () => {
		const descriptors = createCanvasToolDescriptors(capabilities);

		const { type, within } = findDescriptor(
			descriptors,
			"find_objects",
		).inputSchema;

		expect(z.safeParse(type, "rect").success).toBe(true);
		expect(z.safeParse(type, ["rect", "ellipse"]).success).toBe(true);
		// Every condition is optional: a filter setting none is list_objects
		expect(z.safeParse(type, undefined).success).toBe(true);
		expect(
			z.safeParse(within, { x: 0, y: 0, width: 400, height: 300 }).success,
		).toBe(true);
		expect(z.safeParse(within, { x: 0, y: 0 }).success).toBe(false);
	});

	it("sends describe_canvas on to the reading tools a large canvas needs", () => {
		const description = findDescriptor(
			createCanvasToolDescriptors(capabilities),
			"describe_canvas",
		).description;

		expect(description).toContain("cut off");
		expect(description).toContain("list_objects");
		expect(description).toContain("find_objects");
		expect(description).toContain("get_object");
	});

	it("accepts only the four placements on reorder_objects", () => {
		const descriptors = createCanvasToolDescriptors(capabilities);

		const { placement } = findDescriptor(
			descriptors,
			"reorder_objects",
		).inputSchema;

		expect(z.safeParse(placement, "front").success).toBe(true);
		expect(z.safeParse(placement, "backward").success).toBe(true);
		expect(z.safeParse(placement, "top").success).toBe(false);
	});

	it("holds the set_view zoom to the range center_view takes", () => {
		const { zoom } = findDescriptor(
			createCanvasToolDescriptors(capabilities),
			"set_view",
		).inputSchema;

		expect(z.safeParse(zoom, 1).success).toBe(true);
		// SET_CAMERA itself clamps nothing, so the schema is where a broken
		// magnification is stopped
		expect(z.safeParse(zoom, 0.05).success).toBe(false);
		expect(z.safeParse(zoom, 20).success).toBe(false);
	});

	it.each(["fit_view", "capture_canvas"])(
		"takes a target, ids or a world rect on %s",
		(toolName) => {
			const { target, ids, rect } = findDescriptor(
				createCanvasToolDescriptors(capabilities),
				toolName,
			).inputSchema;

			expect(z.safeParse(target, "all").success).toBe(true);
			// Every argument may be left out; which one is missing, or that two are
			// given, is checked where the operation is applied
			expect(z.safeParse(target, undefined).success).toBe(true);
			expect(z.safeParse(ids, ["a", "b"]).success).toBe(true);
			expect(z.safeParse(ids, undefined).success).toBe(true);
			expect(
				z.safeParse(rect, { x: 0, y: 0, width: 200, height: 120 }).success,
			).toBe(true);
		},
	);

	it("shares the region fields between capture_canvas and fit_view, and gives isolate to capture_canvas alone", () => {
		const descriptors = createCanvasToolDescriptors(capabilities);
		const captureSchema = findDescriptor(
			descriptors,
			"capture_canvas",
		).inputSchema;
		const fitSchema = findDescriptor(descriptors, "fit_view").inputSchema;

		expect(Object.keys(fitSchema).sort()).toEqual(["ids", "rect", "target"]);
		for (const field of ["ids", "rect", "target"]) {
			expect(captureSchema[field]).toBe(fitSchema[field]);
		}
		expect(z.safeParse(captureSchema.isolate, true).success).toBe(true);
		expect(z.safeParse(captureSchema.isolate, undefined).success).toBe(true);
	});

	it("takes a point or a rect on hit_test", () => {
		const { point, rect } = findDescriptor(
			createCanvasToolDescriptors(capabilities),
			"hit_test",
		).inputSchema;

		expect(z.safeParse(point, { x: 120, y: 80 }).success).toBe(true);
		expect(
			z.safeParse(rect, { x: 0, y: 0, width: 200, height: 120 }).success,
		).toBe(true);
	});
});

describe("CanvasToolDescriptor.toOp", () => {
	it("passes the arguments straight through as the operation", () => {
		const descriptors = createCanvasToolDescriptors(capabilities);

		expect(
			findDescriptor(descriptors, "add_object").toOp({
				type: "rect",
				x: 10,
				y: 20,
				fill: "#fff",
			}),
		).toEqual({ kind: "addObject", type: "rect", x: 10, y: 20, fill: "#fff" });
		expect(
			findDescriptor(descriptors, "reorder_objects").toOp({
				ids: ["rect-1"],
				placement: "back",
			}),
		).toEqual({ kind: "reorderObjects", ids: ["rect-1"], placement: "back" });
	});

	it("gathers the style arguments of set_style back into one style", () => {
		const descriptors = createCanvasToolDescriptors(capabilities);

		expect(
			findDescriptor(descriptors, "set_style").toOp({
				ids: ["rect-1"],
				fill: "#000",
			}),
		).toEqual({ kind: "setStyle", ids: ["rect-1"], style: { fill: "#000" } });
	});

	it("carries the paint opacities into the style of set_style", () => {
		const descriptors = createCanvasToolDescriptors(capabilities);

		expect(
			findDescriptor(descriptors, "set_style").toOp({
				ids: ["rect-1"],
				fillOpacity: 0.5,
				strokeOpacity: 0.25,
			}),
		).toEqual({
			kind: "setStyle",
			ids: ["rect-1"],
			style: { fillOpacity: 0.5, strokeOpacity: 0.25 },
		});
	});

	it("passes the region arguments of capture_canvas and fit_view straight through", () => {
		const descriptors = createCanvasToolDescriptors(capabilities);
		const rect = { x: 0, y: 0, width: 200, height: 120 };

		expect(findDescriptor(descriptors, "capture_canvas").toOp({})).toEqual({
			kind: "captureCanvas",
		});
		expect(
			findDescriptor(descriptors, "capture_canvas").toOp({ ids: ["a"] }),
		).toEqual({ kind: "captureCanvas", ids: ["a"] });
		expect(
			findDescriptor(descriptors, "capture_canvas").toOp({ rect }),
		).toEqual({ kind: "captureCanvas", rect });
		expect(
			findDescriptor(descriptors, "capture_canvas").toOp({
				ids: ["a"],
				isolate: true,
			}),
		).toEqual({ kind: "captureCanvas", ids: ["a"], isolate: true });
		expect(
			findDescriptor(descriptors, "fit_view").toOp({ target: "selection" }),
		).toEqual({ kind: "fitView", target: "selection" });
		expect(
			findDescriptor(descriptors, "fit_view").toOp({ ids: ["a"] }),
		).toEqual({ kind: "fitView", ids: ["a"] });
	});

	it("carries the id of set_meta only when one is given, so leaving it out addresses the document", () => {
		const descriptors = createCanvasToolDescriptors(capabilities);

		expect(
			findDescriptor(descriptors, "set_meta").toOp({ name: "Overview" }),
		).toEqual({ kind: "setMeta", name: "Overview" });
		expect(
			findDescriptor(descriptors, "set_meta").toOp({
				id: "rect-1",
				description: null,
			}),
		).toEqual({ kind: "setMeta", id: "rect-1", description: null });
	});

	it("builds the argument-less operations from their kind alone", () => {
		const descriptors = createCanvasToolDescriptors(capabilities);

		expect(findDescriptor(descriptors, "describe_canvas").toOp({})).toEqual({
			kind: "describeCanvas",
		});
		expect(findDescriptor(descriptors, "undo").toOp({})).toEqual({
			kind: "undo",
		});
	});
});

describe("CanvasToolDescriptor.inputSchema", () => {
	const parseArgs = (name: string, args: unknown) =>
		z
			.object(
				findDescriptor(createCanvasToolDescriptors(capabilities), name)
					.inputSchema,
			)
			.safeParse(args);

	it("refuses the geometry a document stores when it is written on an add_objects entry", () => {
		// The tools place every type by its bounding box, so cx / cy / ry used to be
		// dropped in silence: four ellipses landed at the origin in the default size.
		// rx is missing from the rejected keys because the style set has one of its
		// own (a rect's corner radius), which is the worse half of the same trap
		const result = parseArgs("add_objects", {
			objects: [{ type: "ellipse", x: 0, y: 0, cx: 39, cy: 126, rx: 5, ry: 5 }],
		});

		expect(result.success).toBe(false);
		expect(result.error?.issues[0]).toMatchObject({
			code: "unrecognized_keys",
			keys: ["cx", "cy", "ry"],
			path: ["objects", 0],
		});
	});

	// One unknown key per schema closed with .strict(). Losing any of them lets the
	// argument through in silence again, which is why every one is listed here
	const unknownKeyCases: readonly {
		tool: string;
		args: Record<string, unknown>;
		path: readonly (string | number)[];
	}[] = [
		{
			tool: "set_points",
			args: {
				id: "poly-1",
				points: [
					{ x: 0, y: 0, z: 0 },
					{ x: 10, y: 10 },
				],
			},
			path: ["points", 0],
		},
		{
			tool: "find_objects",
			args: { within: { x: 0, y: 0, width: 10, height: 10, right: 10 } },
			path: ["within"],
		},
		{
			tool: "connect_many",
			args: { entries: [{ sourceId: "a", targetId: "b", arrow: "end" }] },
			path: ["entries", 0],
		},
		{
			tool: "set_positions",
			args: { entries: [{ id: "a", x: 10, deltaY: 5 }] },
			path: ["entries", 0],
		},
		{
			tool: "set_points_many",
			args: {
				entries: [
					{
						id: "a",
						points: [
							{ x: 0, y: 0 },
							{ x: 10, y: 10 },
						],
						closed: true,
					},
				],
			},
			path: ["entries", 0],
		},
		{
			tool: "set_texts",
			args: { entries: [{ id: "a", text: "hello", slotName: "name" }] },
			path: ["entries", 0],
		},
		{
			tool: "set_text_styles",
			args: { entries: [{ id: "a", match: "hello", bold: true }] },
			path: ["entries", 0],
		},
		{
			tool: "update_connectors",
			args: { entries: [{ id: "c", curve: "arc" }] },
			path: ["entries", 0],
		},
		{
			tool: "capture_canvas",
			args: { rect: { x: 0, y: 0, width: 10, height: 10, right: 10 } },
			path: ["rect"],
		},
		{
			tool: "fit_view",
			args: { rect: { x: 0, y: 0, width: 10, height: 10, right: 10 } },
			path: ["rect"],
		},
	];

	it.each(unknownKeyCases)(
		"refuses an unknown key on $tool at $path",
		({ tool, args, path }) => {
			const result = parseArgs(tool, args);

			expect(result.success).toBe(false);
			expect(result.error?.issues[0]).toMatchObject({
				code: "unrecognized_keys",
				path,
			});
		},
	);

	it.each(["capture_canvas", "fit_view"])(
		"refuses an empty ids and, closed as a host closes it, an unknown key on %s",
		(toolName) => {
			const closedSchema = z
				.object(
					findDescriptor(createCanvasToolDescriptors(capabilities), toolName)
						.inputSchema,
				)
				.strict();

			expect(closedSchema.safeParse({ ids: [] }).success).toBe(false);
			expect(closedSchema.safeParse({ zoom: 2 }).success).toBe(false);
			expect(closedSchema.safeParse({}).success).toBe(true);
			expect(closedSchema.safeParse({ ids: ["a"] }).success).toBe(true);
		},
	);

	it("still takes the arguments the closed schemas declare", () => {
		expect(
			parseArgs("add_objects", {
				objects: [
					{ type: "ellipse", x: 39, y: 126, width: 10, height: 10 },
					{ type: "rect", x: 0, y: 0, text: "box", fill: "#fff" },
				],
				groupNewObjects: true,
			}).success,
		).toBe(true);
		expect(
			parseArgs("connect_many", {
				entries: [
					{ sourceId: "a", targetId: "b", endArrow: "FilledTriangle" },
					{ sourceId: "b", targetPoint: { x: 10, y: 20 } },
				],
			}).success,
		).toBe(true);
		expect(
			parseArgs("connect_many", {
				entries: [
					{
						sourceId: "a",
						targetId: "b",
						label: "yes",
						labelPosition: 0.25,
						labelOffset: -12,
					},
				],
			}).success,
		).toBe(true);
		expect(
			parseArgs("set_text_styles", {
				entries: [
					{ id: "a", match: "hello", occurrence: 1, fontWeight: "bold" },
				],
			}).success,
		).toBe(true);
	});

	it("holds the connect labelPosition to 0..1", () => {
		const result = parseArgs("connect", {
			sourceId: "a",
			targetId: "b",
			label: "yes",
			labelPosition: 2,
		});

		expect(result.success).toBe(false);
		expect(result.error?.issues[0]).toMatchObject({
			path: ["labelPosition"],
		});
	});

	it("leaves extraProps open, the names being the type's own and checked downstream", () => {
		const result = parseArgs("add_objects", {
			objects: [
				{
					type: "rect",
					x: 0,
					y: 0,
					extraProps: { headerFill: "#eee", headerHeight: 24 },
				},
			],
		});

		expect(result.success).toBe(true);
		expect(result.data).toEqual({
			objects: [
				{
					type: "rect",
					x: 0,
					y: 0,
					extraProps: { headerFill: "#eee", headerHeight: 24 },
				},
			],
		});
	});

	it("takes a weight as a number as well as a word, both spellings of the ladder being real arguments", () => {
		for (const fontWeight of ["normal", "400", "500", "600", "700", "bold"]) {
			expect(
				parseArgs("add_object", { type: "rect", x: 0, y: 0, fontWeight })
					.success,
				`add_object should take fontWeight ${fontWeight}`,
			).toBe(true);
			expect(
				parseArgs("set_text_style", { id: "a", match: "hi", fontWeight })
					.success,
				`set_text_style should take fontWeight ${fontWeight}`,
			).toBe(true);
		}
	});

	it("refuses a weight off the shipped ladder, numeric or not", () => {
		expect(
			parseArgs("add_object", {
				type: "rect",
				x: 0,
				y: 0,
				fontWeight: "800",
			}).success,
		).toBe(false);
		expect(
			parseArgs("set_text_style", {
				id: "a",
				match: "hi",
				fontWeight: "bolder",
			}).success,
		).toBe(false);
	});

	it("takes a paint opacity anywhere in 0..1 and refuses one outside it", () => {
		for (const fillOpacity of [0, 0.5, 1]) {
			expect(
				parseArgs("add_object", { type: "rect", x: 0, y: 0, fillOpacity })
					.success,
				`add_object should take fillOpacity ${fillOpacity}`,
			).toBe(true);
		}
		expect(
			parseArgs("set_style", { ids: ["rect-1"], fillOpacity: 1.5 }).success,
		).toBe(false);
		expect(
			parseArgs("set_style", { ids: ["rect-1"], strokeOpacity: -0.5 }).success,
		).toBe(false);
	});

	it("marks the closed entries additionalProperties: false, so the model reads the contract first", () => {
		const jsonSchema = z.toJSONSchema(
			z.object(
				findDescriptor(createCanvasToolDescriptors(capabilities), "add_objects")
					.inputSchema,
			),
		);

		expect(jsonSchema).toMatchObject({
			properties: { objects: { items: { additionalProperties: false } } },
		});
	});
});
