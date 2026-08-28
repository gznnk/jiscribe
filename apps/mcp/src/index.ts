import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { createJiscribeMcpServer } from "./server";

/**
 * jiscribe-mcp の実行エントリ（PoC）。stdio で動く独立プロセスとして
 * `./server` のツール群を AI クライアントへ公開する。
 */
async function main(): Promise<void> {
	const transport = new StdioServerTransport();
	await createJiscribeMcpServer().connect(transport);
	// stdio サーバーは接続後、stdin が閉じるまで動き続ける。
}

main().catch((error: unknown) => {
	console.error("jiscribe-mcp failed to start:", error);
	process.exit(1);
});
