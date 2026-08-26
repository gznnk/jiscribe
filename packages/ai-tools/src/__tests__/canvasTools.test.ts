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

	it("takes a target or a world rect on fit_view", () => {
		const { target, rect } = findDescriptor(
			createCanvasToolDescriptors(capabilities),
			"fit_view",
		).inputSchema;

		expect(z.safeParse(target, "all").success).toBe(true);
		// Either argument may be left out; which one is missing is checked where the
		// operation is applied
		expect(z.safeParse(target, undefined).success).toBe(true);
		expect(
			z.safeParse(rect, { x: 0, y: 0, width: 200, height: 120 }).success,
		).toBe(true);
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

	it("builds the argument-less operations from their kind alone", () => {
		const descriptors = createCanvasToolDescriptors(capabilities);

		expect(findDescriptor(descriptors, "describe_canvas").toOp({})).toEqual({
			kind: "describeCanvas",
		});
		expect(findDescriptor(descriptors, "capture_canvas").toOp({})).toEqual({
			kind: "captureCanvas",
		});
		expect(findDescriptor(descriptors, "undo").toOp({})).toEqual({
			kind: "undo",
		});
	});
});
