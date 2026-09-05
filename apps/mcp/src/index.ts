import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { createJiscribeMcpServer } from "./server";

/**
 * How long the shutdown is given before the process is ended regardless. The timer
 * is unref'd, so it never keeps a process alive that would otherwise be done; it
 * only catches a teardown that hangs (a browser that will not let go of the port)
 */
const FORCED_EXIT_DELAY_MS = 10_000;

/**
 * The jiscribe-mcp executable entry point (PoC). Exposes the tools in `./server`
 * to AI clients as a standalone process running over stdio.
 */
async function main(): Promise<void> {
	const transport = new StdioServerTransport();
	const server = createJiscribeMcpServer();
	await server.connect(transport);

	// Closing the server runs the teardown registered on its onclose, which asks the
	// viewers to close and folds the canvas host up. Nothing is exited by hand: once
	// the host has given the port back the event loop empties and the process ends
	// on its own. SIGKILL never reaches here, and a headless window left behind by
	// one closes itself when it can no longer reach the host (see the viewer's App)
	const shutdown = (): void => {
		setTimeout(() => {
			process.exit(0);
		}, FORCED_EXIT_DELAY_MS).unref();
		void server.close();
	};
	process.on("SIGINT", shutdown);
	process.on("SIGTERM", shutdown);
	// A client that ends stdin instead of sending a signal has to be caught here:
	// the SDK's transport listens for data and errors only, so the end of stdin
	// never reaches its onclose on its own, and the host would keep the process up
	process.stdin.once("end", shutdown);
}

main().catch((error: unknown) => {
	console.error("jiscribe-mcp failed to start:", error);
	process.exit(1);
});
