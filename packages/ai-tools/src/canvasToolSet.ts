// The tool set a host declares and applies from: the built-in canvas tools plus
// the object tools plugins offer. Declaring and applying both read the one value
// this builds, so a tool the model is offered is always one applying can resolve.

import type {
	AiToolPlugin,
	ObjectAiToolDefinition,
} from "@jiscribe/ai-tools-sdk";
import { z } from "zod";

import {
	createCanvasToolDescriptors,
	type CanvasToolDescriptor,
} from "./canvasTools";
import type { AiCanvasCapabilities } from "./capabilities";

/** The argument the host adds to every object tool to name its target */
const OBJECT_TOOL_TARGET_ARG = "id";

/**
 * Declarations and plugin tools resolved together; build one with
 * {@link createCanvasToolSet} and hand the same value to the declaring side and to
 * `applyCanvasOp`.
 */
export type CanvasToolSet = {
	/** Every tool the model is offered: the built-ins first, then the plugin tools in plugin order */
	descriptors: readonly CanvasToolDescriptor[];
	/** The plugin tools among them by name; what applying resolves an `objectTool` op through */
	objectTools: ReadonlyMap<string, ObjectAiToolDefinition>;
};

/** The declaration of one plugin tool, with the target `id` put in front of its own arguments */
const toObjectToolDescriptor = (
	tool: ObjectAiToolDefinition,
): CanvasToolDescriptor => ({
	name: tool.name,
	description: tool.description,
	inputSchema: {
		[OBJECT_TOOL_TARGET_ARG]: z
			.string()
			.describe(
				`id of the ${tool.objectType} object to act on; an object of any other type is refused.`,
			),
		...tool.inputSchema,
	},
	toOp: ({ [OBJECT_TOOL_TARGET_ARG]: id, ...args }) => ({
		kind: "objectTool",
		tool: tool.name,
		// The schema above has already validated it as a string
		id: id as string,
		args,
	}),
	isReadOnly: tool.read !== undefined,
	drives:
		tool.read !== undefined ? ["plugin"] : ["plugin", "docOps.replaceObject"],
});

/**
 * Refuses a plugin tool the set could not serve as declared: one naming its own `id`
 * argument, and one with both or neither of `apply` / `read` (reachable from untyped code)
 */
const checkObjectTool = (
	tool: ObjectAiToolDefinition,
	pluginId: string,
): void => {
	if (Object.hasOwn(tool.inputSchema, OBJECT_TOOL_TARGET_ARG)) {
		throw new Error(
			`AI tool "${tool.name}" of plugin "${pluginId}" declares "${OBJECT_TOOL_TARGET_ARG}" itself; the host adds it to name the target object`,
		);
	}
	if ((tool.apply === undefined) === (tool.read === undefined)) {
		throw new Error(
			`AI tool "${tool.name}" of plugin "${pluginId}" must have exactly one of apply and read`,
		);
	}
};

/**
 * Resolves the tool set a host offers and applies from.
 *
 * Plugin tool names are checked against the built-ins and against each other across
 * every plugin given, whether or not its type is then offered, so a clash fails the
 * same way on every host.
 *
 * @param capabilities - The shape types to name in the schemas. null means "not
 *   received yet": the add_object type becomes a free string and every plugin tool
 *   is left out, there being no way yet to tell whether its type is offered
 * @param aiToolPlugins - The plugins' tool bundles (`standardAiToolPlugins` for the
 *   shipped set); empty for a host offering the built-ins alone. A tool whose
 *   `objectType` is not among `capabilities.creatableObjectTypes` is left out
 * @returns The declarations and the plugin tools behind them
 * @throws When a plugin tool's name repeats a built-in or another plugin tool, when
 *   it declares `id` itself, or when it has both or neither of `apply` / `read`
 */
export const createCanvasToolSet = (
	capabilities: AiCanvasCapabilities | null,
	aiToolPlugins: readonly AiToolPlugin[],
): CanvasToolSet => {
	const builtinDescriptors = createCanvasToolDescriptors(capabilities);
	const ownerByName = new Map<string, string>(
		builtinDescriptors.map((descriptor) => [descriptor.name, "the built-ins"]),
	);
	const checkedTools: ObjectAiToolDefinition[] = [];
	for (const plugin of aiToolPlugins) {
		for (const tool of plugin.tools) {
			checkObjectTool(tool, plugin.id);
			const owner = ownerByName.get(tool.name);
			if (owner !== undefined) {
				throw new Error(
					`AI tool "${tool.name}" of plugin "${plugin.id}" repeats a name already used by ${owner}`,
				);
			}
			ownerByName.set(tool.name, `plugin "${plugin.id}"`);
			checkedTools.push(tool);
		}
	}

	const offeredTypes = new Set(capabilities?.creatableObjectTypes ?? []);
	const offeredTools = checkedTools.filter((tool) =>
		offeredTypes.has(tool.objectType),
	);
	return {
		descriptors: [
			...builtinDescriptors,
			...offeredTools.map(toObjectToolDescriptor),
		],
		objectTools: new Map(offeredTools.map((tool) => [tool.name, tool])),
	};
};
