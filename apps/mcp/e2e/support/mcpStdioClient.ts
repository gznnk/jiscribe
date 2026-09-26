// An MCP client on the built server, spoken to over stdio the way a real client
// does.
//
// The vitest suite connects `createJiscribeMcpServer()` in-process over
// `InMemoryTransport` (src/__tests__/mcpTestClient.ts). Here the server is taken
// as it is shipped — the bundle globalSetup builds — so what a browser is driven
// against is the artifact itself, and the process boundary buys the environment
// being set per test rather than through this one's `process.env`.

import path from "node:path";
import { fileURLToPath } from "node:url";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

/** The built server, relative to this file (apps/mcp/e2e/support) */
const SERVER_ENTRY_PATH = fileURLToPath(
	new URL("../../dist/index.mjs", import.meta.url),
);

/**
 * One content part of a `tools/call` result, as the protocol carries it. Left
 * loosely typed on purpose: what is interesting about a part that is not text
 * (`capture_canvas`'s image) is the fields a text part does not have.
 */
export type ToolCallPart = { type: string } & Record<string, unknown>;

/** The result of one `tools/call`. */
export type ToolCallResult = {
	/** The parts in the order the tool returned them */
	parts: ToolCallPart[];
	/** The text parts joined with newlines. An error rides in here as `error: ...` */
	text: string;
	/**
	 * Whether the protocol layer returned it as an error (an argument of the wrong
	 * type, and the like). A tool that refused on its own terms answers false here
	 * and says so in the text
	 */
	isError: boolean;
};

/** A client on a running server process. Call `close` when you are done with it. */
export type McpStdioClient = {
	/**
	 * Calls one tool.
	 *
	 * @param name The tool name (`open_canvas`, for instance)
	 * @param args The argument object. It goes through the server's zod schema, so
	 *   a type violation comes back as isError rather than throwing
	 */
	callTool: (
		name: string,
		args: Record<string, unknown>,
	) => Promise<ToolCallResult>;
	/** Stops the server, which closes its viewer windows and gives the port back. */
	close: () => Promise<void>;
};

/**
 * Starts the built server and connects to it.
 *
 * @param env Environment entries put on top of this process's own, for the
 *   variables the server reads at runtime (`JISCRIBE_MCP_BROWSER` and the like).
 *   `JISCRIBE_MCP_NO_OPEN` is set here already, so nothing lands on the screen
 *   unless a test asks for a headless window
 * @returns The connected client
 */
export async function connectMcpStdioClient(
	env: Record<string, string> = {},
): Promise<McpStdioClient> {
	const transport = new StdioClientTransport({
		command: process.execPath,
		args: [SERVER_ENTRY_PATH],
		cwd: path.dirname(SERVER_ENTRY_PATH),
		env: {
			...(process.env as Record<string, string>),
			JISCRIBE_MCP_NO_OPEN: "1",
			...env,
		},
		// The server writes nothing but diagnostics there, and swallowing them would
		// leave a failing test with no reason
		stderr: "inherit",
	});
	const client = new Client({ name: "jiscribe-mcp-e2e", version: "0.0.0" });
	await client.connect(transport);

	return {
		callTool: async (name, args) => {
			const result = await client.callTool({ name, arguments: args });
			const content = Array.isArray(result.content) ? result.content : [];
			const parts = content as ToolCallPart[];
			return {
				parts,
				text: parts
					.map((part) => ("text" in part ? String(part.text) : ""))
					.join("\n"),
				isError: result.isError === true,
			};
		},
		close: async () => {
			await client.close();
		},
	};
}
