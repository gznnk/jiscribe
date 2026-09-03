import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { createJiscribeMcpServer } from "./server";

/**
 * The jiscribe-mcp executable entry point (PoC). Exposes the tools in `./server`
 * to AI clients as a standalone process running over stdio.
 */
async function main(): Promise<void> {
	const transport = new StdioServerTransport();
	await createJiscribeMcpServer().connect(transport);
	// Once connected, a stdio server keeps running until stdin closes.
}

main().catch((error: unknown) => {
	console.error("jiscribe-mcp failed to start:", error);
	process.exit(1);
});
