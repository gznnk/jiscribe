import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

import { createJiscribeMcpServer } from "../server";

/**
 * The result of one `tools/call`. The text is the content's text blocks joined
 * with newlines.
 */
export type ToolCallResult = {
	/**
	 * The body the tool returned. An error, too, rides in the body as
	 * `error: ...`.
	 */
	text: string;
	/**
	 * Whether the protocol layer returned it as an error (an argument of the
	 * wrong type, and the like).
	 */
	isError: boolean;
};

/**
 * A test client connected to the server. Call `close` when you are done with
 * it.
 */
export type McpTestClient = {
	/**
	 * Calls one tool.
	 *
	 * @param name - The tool name (`diagnose_canvas`, for instance)
	 * @param args - The argument object. It goes through the zod schema's
	 *   validation, so a type violation comes back as isError
	 */
	callTool: (
		name: string,
		args: Record<string, unknown>,
	) => Promise<ToolCallResult>;
	/**
	 * Returns the names of the registered tools, in the order they were
	 * registered.
	 */
	listToolNames: () => Promise<string[]>;
	/**
	 * Returns one tool's description. A tool holding no description gives an
	 * empty string.
	 *
	 * @param name - The tool name. Throws if it is not registered
	 */
	getToolDescription: (name: string) => Promise<string>;
	/**
	 * Returns one tool's whole input schema (JSON Schema).
	 *
	 * @param name - The tool name. Throws if it is not registered
	 */
	getToolInputSchema: (name: string) => Promise<Record<string, unknown>>;
	/**
	 * Returns the property table of one tool's input schema.
	 *
	 * @param name - The tool name. Throws if it is not registered
	 */
	getToolInputProperties: (name: string) => Promise<Record<string, unknown>>;
	close: () => Promise<void>;
};

/**
 * Connects the same `createJiscribeMcpServer()` production uses over an
 * in-memory transport.
 *
 * It is faster for standing up no child process, but what it goes through is
 * the same JSON-RPC path as stdio, so tool registration and zod's argument
 * validation still apply as they are.
 */
export async function connectMcpTestClient(): Promise<McpTestClient> {
	const [clientTransport, serverTransport] =
		InMemoryTransport.createLinkedPair();
	const server = createJiscribeMcpServer();
	const client = new Client({ name: "mcp-test", version: "0.0.0" });
	await Promise.all([
		server.connect(serverTransport),
		client.connect(clientTransport),
	]);

	const findTool = async (name: string) => {
		const tool = (await client.listTools()).tools.find(
			(listed) => listed.name === name,
		);
		if (tool === undefined) {
			throw new Error(`tool "${name}" is not registered`);
		}
		return tool;
	};

	return {
		callTool: async (name, args) => {
			const result = await client.callTool({ name, arguments: args });
			const content = Array.isArray(result.content) ? result.content : [];
			const text = content
				.map((part) =>
					typeof part === "object" && part !== null && "text" in part
						? String(part.text)
						: "",
				)
				.join("\n");
			return { text, isError: result.isError === true };
		},
		listToolNames: async () =>
			(await client.listTools()).tools.map((tool) => tool.name),
		getToolDescription: async (name) =>
			(await findTool(name)).description ?? "",
		getToolInputSchema: async (name) => (await findTool(name)).inputSchema,
		getToolInputProperties: async (name) =>
			(await findTool(name)).inputSchema.properties ?? {},
		close: async () => {
			await client.close();
			await server.close();
		},
	};
}
