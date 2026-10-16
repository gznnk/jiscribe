import {
	defineObjectAiTool,
	type AiToolPlugin,
	type ObjectAiToolDefinition,
} from "@jiscribe/ai-tools-sdk";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import { createCanvasToolDescriptors } from "../canvasTools";
import { createCanvasToolSet } from "../canvasToolSet";
import type { AiCanvasCapabilities } from "../capabilities";

const capabilities: AiCanvasCapabilities = {
	creatableObjectTypes: ["rect", "ellipse"],
	connectableObjectTypes: ["rect", "ellipse"],
};

/** A writing tool on `objectType` that changes nothing; only its declaration is under test */
const writeTool = (name: string, objectType = "rect"): ObjectAiToolDefinition =>
	defineObjectAiTool({
		name,
		description: `${name} for testing.`,
		objectType,
		inputSchema: { amount: z.number() },
		apply: (objectDoc) => ({ doc: objectDoc, text: "done" }),
	});

/** A reading tool on `objectType`; only its declaration is under test */
const readTool = (name: string, objectType = "rect"): ObjectAiToolDefinition =>
	defineObjectAiTool({
		name,
		description: `${name} for testing.`,
		objectType,
		inputSchema: {},
		read: () => "read",
	});

/** Descriptors compared by name; each build makes its own toOp closures */
const namesOf = (descriptors: readonly { name: string }[]): readonly string[] =>
	descriptors.map((descriptor) => descriptor.name);

const toolPlugin = (
	id: string,
	tools: readonly ObjectAiToolDefinition[],
): AiToolPlugin => ({ id, tools });

describe("createCanvasToolSet", () => {
	it("is the built-in tool set when no plugin offers any tools", () => {
		const toolSet = createCanvasToolSet(capabilities, []);

		expect(namesOf(toolSet.descriptors)).toEqual(
			namesOf(createCanvasToolDescriptors(capabilities)),
		);
		expect(toolSet.objectTools.size).toBe(0);
	});

	it("declares plugin tools after the built-ins, in plugin order, with the target id added", () => {
		const toolSet = createCanvasToolSet(capabilities, [
			toolPlugin("first", [writeTool("rect_grow")]),
			toolPlugin("second", [readTool("ellipse_read", "ellipse")]),
		]);

		expect(namesOf(toolSet.descriptors).slice(-2)).toEqual([
			"rect_grow",
			"ellipse_read",
		]);
		expect([...toolSet.objectTools.keys()]).toEqual([
			"rect_grow",
			"ellipse_read",
		]);

		const growDescriptor = toolSet.descriptors.at(-2);
		expect(Object.keys(growDescriptor?.inputSchema ?? {})).toEqual([
			"id",
			"amount",
		]);
		expect(growDescriptor?.toOp({ id: "rect-1", amount: 3 })).toEqual({
			kind: "objectTool",
			tool: "rect_grow",
			id: "rect-1",
			args: { amount: 3 },
		});
	});

	it("marks a reading tool read-only and has every plugin tool drive the plugin", () => {
		const toolSet = createCanvasToolSet(capabilities, [
			toolPlugin("tools", [writeTool("rect_grow"), readTool("rect_read")]),
		]);
		const [growDescriptor, readDescriptor] = toolSet.descriptors.slice(-2);

		expect(growDescriptor?.isReadOnly).toBe(false);
		expect(growDescriptor?.drives).toEqual(["plugin", "docOps.replaceObject"]);
		expect(readDescriptor?.isReadOnly).toBe(true);
		expect(readDescriptor?.drives).toEqual(["plugin"]);
	});

	it("leaves out a tool whose type the capabilities do not offer, from both halves", () => {
		const toolSet = createCanvasToolSet(capabilities, [
			toolPlugin("tools", [
				writeTool("rect_grow"),
				writeTool("star_grow", "star"),
			]),
		]);

		expect(namesOf(toolSet.descriptors)).toContain("rect_grow");
		expect(namesOf(toolSet.descriptors)).not.toContain("star_grow");
		expect(toolSet.objectTools.has("star_grow")).toBe(false);
	});

	it("leaves out every plugin tool until the capabilities arrive", () => {
		const toolSet = createCanvasToolSet(null, [
			toolPlugin("tools", [writeTool("rect_grow")]),
		]);

		expect(namesOf(toolSet.descriptors)).toEqual(
			namesOf(createCanvasToolDescriptors(null)),
		);
		expect(toolSet.objectTools.size).toBe(0);
	});

	it("throws for a name a built-in tool already uses", () => {
		expect(() =>
			createCanvasToolSet(capabilities, [
				toolPlugin("tools", [writeTool("set_style")]),
			]),
		).toThrow(
			'AI tool "set_style" of plugin "tools" repeats a name already used by the built-ins',
		);
	});

	it("throws for a name another plugin already uses, even when that tool is left out", () => {
		expect(() =>
			createCanvasToolSet(capabilities, [
				toolPlugin("first", [writeTool("shared_grow", "star")]),
				toolPlugin("second", [writeTool("shared_grow")]),
			]),
		).toThrow('repeats a name already used by plugin "first"');
	});

	it("throws for a tool that declares the target id itself", () => {
		const tool = defineObjectAiTool({
			name: "rect_with_id",
			description: "Declares id.",
			objectType: "rect",
			inputSchema: { id: z.string() },
			read: () => "read",
		});

		expect(() =>
			createCanvasToolSet(capabilities, [toolPlugin("tools", [tool])]),
		).toThrow('declares "id" itself');
	});

	it("throws for a tool with neither apply nor read, which only untyped code can build", () => {
		const tool = {
			name: "rect_nothing",
			description: "Does nothing.",
			objectType: "rect",
			inputSchema: {},
		} as unknown as ObjectAiToolDefinition;

		expect(() =>
			createCanvasToolSet(capabilities, [toolPlugin("tools", [tool])]),
		).toThrow("must have exactly one of apply and read");
	});
});
