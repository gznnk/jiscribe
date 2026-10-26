import { parseArgs } from "node:util";

import { z } from "zod";

import {
	docToolDescriptors,
	findDocTool,
	toArgsSchema,
} from "./docToolCatalog";
import { parseCommandArgs } from "./parseCommandArgs";

const USAGE = "usage: jiscribe tools [<tool>] [--json]\n";

/**
 * A description's first sentence: up to the first `.`, `!` or `?` followed by
 * whitespace, or the whole text when there is none.
 */
const toSummary = (description: string): string => {
	const match = /^[\s\S]*?[.!?](?=\s|$)/.exec(description);
	return (match === null ? description : match[0]).replaceAll(/\s+/g, " ");
};

/**
 * Lists the tools `jiscribe op` runs, or describes one of them.
 *
 * @param argv - Arguments after the sub-command name: an optional tool name, and `--json` for the same content as one object; a tool name needing a viewer, or undo, is refused with why
 * @returns The process exit code: 0 on success, 1 for a tool that is not runnable here, 2 for a malformed command line
 */
export const runToolsCommand = (argv: readonly string[]): number => {
	const parsed = parseCommandArgs(USAGE, () =>
		parseArgs({
			args: [...argv],
			options: { json: { type: "boolean", default: false } },
			allowPositionals: true,
		}),
	);
	if (parsed === null) {
		return 2;
	}
	const { values, positionals } = parsed;
	if (positionals.length > 1) {
		process.stderr.write(
			`error: unexpected argument: ${positionals[1]}\n${USAGE}`,
		);
		return 2;
	}

	const [toolName] = positionals;
	if (toolName === undefined) {
		const tools = docToolDescriptors.map((descriptor) => ({
			name: descriptor.name,
			summary: toSummary(descriptor.description),
		}));
		if (values.json) {
			process.stdout.write(`${JSON.stringify({ tools }, null, 2)}\n`);
		} else {
			const nameWidth = Math.max(...tools.map((tool) => tool.name.length));
			process.stdout.write(
				tools
					.map((tool) => `${tool.name.padEnd(nameWidth)}  ${tool.summary}\n`)
					.join(""),
			);
		}
		return 0;
	}

	const lookup = findDocTool(toolName);
	if (!lookup.ok) {
		process.stderr.write(`error: ${lookup.message}\n`);
		return 1;
	}
	const { descriptor } = lookup;
	// The conversion jiscribe-mcp's SDK applies for tools/list, so the schema
	// printed is the one an MCP client reads, less the `path` it adds
	const inputSchema = z.toJSONSchema(toArgsSchema(descriptor), {
		target: "draft-7",
		io: "input",
	});
	if (values.json) {
		process.stdout.write(
			`${JSON.stringify(
				{
					name: descriptor.name,
					description: descriptor.description,
					inputSchema,
				},
				null,
				2,
			)}\n`,
		);
	} else {
		process.stdout.write(
			`${descriptor.name}\n\n${descriptor.description}\n\narguments (JSON Schema):\n${JSON.stringify(inputSchema, null, 2)}\n`,
		);
	}
	return 0;
};
