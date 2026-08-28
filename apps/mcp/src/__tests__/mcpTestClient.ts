import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

import { createJiscribeMcpServer } from "../server";

/** 1 回の `tools/call` の結果。テキストは content の text ブロックを改行で継いだもの。 */
export type ToolCallResult = {
	/** ツールが返した本文。エラー時も本文に `error: 〜` として載る。 */
	text: string;
	/** プロトコル層がエラーとして返したか（引数の型違反など）。 */
	isError: boolean;
};

/** サーバーへ繋いだテストクライアント。使い終わったら `close` すること。 */
export type McpTestClient = {
	/**
	 * ツールを 1 つ呼ぶ。
	 *
	 * @param name - ツール名（`validate_canvas` など）
	 * @param args - 引数オブジェクト。zod スキーマの検証を通るので、型違反は isError で返る
	 */
	callTool: (
		name: string,
		args: Record<string, unknown>,
	) => Promise<ToolCallResult>;
	/** 登録されているツール名の一覧を、登録順のまま返す。 */
	listToolNames: () => Promise<string[]>;
	/**
	 * 1 ツールの入力スキーマ（JSON Schema）を丸ごと返す。
	 *
	 * @param name - ツール名。未登録なら例外を投げる
	 */
	getToolInputSchema: (name: string) => Promise<Record<string, unknown>>;
	/**
	 * 1 ツールの入力スキーマのプロパティ表を返す。
	 *
	 * @param name - ツール名。未登録なら例外を投げる
	 */
	getToolInputProperties: (name: string) => Promise<Record<string, unknown>>;
	close: () => Promise<void>;
};

/**
 * 本番と同じ `createJiscribeMcpServer()` を in-memory トランスポートで繋ぐ。
 *
 * 子プロセスを立てないぶん速いが、通るのは stdio と同じ JSON-RPC 経路なので
 * ツール登録と zod による引数検証はそのまま効く。
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
		getToolInputSchema: async (name) => (await findTool(name)).inputSchema,
		getToolInputProperties: async (name) =>
			(await findTool(name)).inputSchema.properties ?? {},
		close: async () => {
			await client.close();
			await server.close();
		},
	};
}
