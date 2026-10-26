import http from "node:http";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import {
	createJiscribeMcpRuntime,
	createJiscribeMcpServer,
	type JiscribeMcpRuntime,
} from "jiscribe-mcp/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { startMcpHttpServer, type McpHttpServer } from "../mcpHttpServer";

const INITIALIZE_REQUEST = {
	jsonrpc: "2.0",
	id: 1,
	method: "initialize",
	params: {
		protocolVersion: "2025-06-18",
		capabilities: {},
		clientInfo: { name: "raw-http-test", version: "0.0.0" },
	},
};

/** The tool count of a server built the way the stdio entry point builds one */
const countStdioServerTools = async (): Promise<number> => {
	const [clientTransport, serverTransport] =
		InMemoryTransport.createLinkedPair();
	const server = createJiscribeMcpServer();
	await server.connect(serverTransport);
	const client = new Client({ name: "stdio-count", version: "0.0.0" });
	await client.connect(clientTransport);
	const { tools } = await client.listTools();
	await client.close();
	await server.close();
	return tools.length;
};

const connectClient = async (url: string): Promise<Client> => {
	const client = new Client({ name: "desktop-test", version: "0.0.0" });
	await client.connect(new StreamableHTTPClientTransport(new URL(url)));
	return client;
};

/** POST a JSON body to the endpoint with the headers given, bypassing the SDK client */
const postRaw = (
	url: string,
	headers: Record<string, string>,
	body: unknown,
): Promise<number> =>
	new Promise((resolve, reject) => {
		const request = http.request(
			url,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Accept: "application/json, text/event-stream",
					...headers,
				},
			},
			(response) => {
				response.resume();
				resolve(response.statusCode ?? 0);
			},
		);
		request.on("error", reject);
		request.end(JSON.stringify(body));
	});

/**
 * Start a session with a bare initialize, as a client that never opens the
 * event stream does.
 *
 * @returns The session ID the endpoint handed out
 */
const initializeRaw = (url: string): Promise<string> =>
	new Promise((resolve, reject) => {
		const request = http.request(
			url,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Accept: "application/json, text/event-stream",
				},
			},
			(response) => {
				response.resume();
				const sessionId = response.headers["mcp-session-id"];
				if (response.statusCode !== 200 || typeof sessionId !== "string") {
					reject(new Error(`initialize answered ${response.statusCode}`));
					return;
				}
				resolve(sessionId);
			},
		);
		request.on("error", reject);
		request.end(JSON.stringify(INITIALIZE_REQUEST));
	});

const TOOLS_LIST_REQUEST = {
	jsonrpc: "2.0",
	id: 2,
	method: "tools/list",
	params: {},
};

describe("startMcpHttpServer", () => {
	let runtime: JiscribeMcpRuntime;
	let mcpHttpServer: McpHttpServer;
	const openClients: Client[] = [];

	beforeEach(async () => {
		runtime = createJiscribeMcpRuntime({ launchViewer: () => {} });
		mcpHttpServer = await startMcpHttpServer({ runtime, port: 0 });
	});

	afterEach(async () => {
		await Promise.all(openClients.splice(0).map((client) => client.close()));
		await mcpHttpServer.close();
		await runtime.close();
	});

	it("binds 127.0.0.1 and serves /mcp", () => {
		expect(mcpHttpServer.url).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/mcp$/);
	});

	it("lists the same tools as the stdio server", async () => {
		const client = await connectClient(mcpHttpServer.url);
		openClients.push(client);
		const { tools } = await client.listTools();
		const stdioToolCount = await countStdioServerTools();
		expect(stdioToolCount).toBeGreaterThan(80);
		expect(tools).toHaveLength(stdioToolCount);
	});

	it("gives two clients two sessions, both seeing the tools", async () => {
		const firstTransport = new StreamableHTTPClientTransport(
			new URL(mcpHttpServer.url),
		);
		const secondTransport = new StreamableHTTPClientTransport(
			new URL(mcpHttpServer.url),
		);
		const firstClient = new Client({ name: "first", version: "0.0.0" });
		const secondClient = new Client({ name: "second", version: "0.0.0" });
		await firstClient.connect(firstTransport);
		await secondClient.connect(secondTransport);
		openClients.push(firstClient, secondClient);

		expect(firstTransport.sessionId).toBeDefined();
		expect(secondTransport.sessionId).toBeDefined();
		expect(firstTransport.sessionId).not.toBe(secondTransport.sessionId);
		const [firstTools, secondTools] = await Promise.all([
			firstClient.listTools(),
			secondClient.listTools(),
		]);
		expect(firstTools.tools.length).toBeGreaterThan(80);
		expect(secondTools.tools).toHaveLength(firstTools.tools.length);
	});

	it("refuses a request whose Host is not its own", async () => {
		const { port } = new URL(mcpHttpServer.url);
		const statusCode = await postRaw(
			mcpHttpServer.url,
			{ Host: `attacker.example:${port}` },
			INITIALIZE_REQUEST,
		);
		expect(statusCode).toBe(403);
	});

	it("accepts localhost as the Host", async () => {
		const { port } = new URL(mcpHttpServer.url);
		const statusCode = await postRaw(
			mcpHttpServer.url,
			{ Host: `localhost:${port}` },
			INITIALIZE_REQUEST,
		);
		expect(statusCode).toBe(200);
	});

	it("refuses a request a browser page sent, whatever its Origin", async () => {
		const { port } = new URL(mcpHttpServer.url);
		const foreignStatus = await postRaw(
			mcpHttpServer.url,
			{ Origin: "https://attacker.example" },
			INITIALIZE_REQUEST,
		);
		expect(foreignStatus).toBe(403);
		const ownStatus = await postRaw(
			mcpHttpServer.url,
			{ Origin: `http://127.0.0.1:${port}` },
			INITIALIZE_REQUEST,
		);
		expect(ownStatus).toBe(403);
	});

	it("gives the 65th session the slot of the one quiet the longest", async () => {
		const firstSessionId = await initializeRaw(mcpHttpServer.url);
		for (let count = 1; count < 64; count += 1) {
			await initializeRaw(mcpHttpServer.url);
		}
		await initializeRaw(mcpHttpServer.url);
		const evictedStatus = await postRaw(
			mcpHttpServer.url,
			{ "mcp-session-id": firstSessionId },
			TOOLS_LIST_REQUEST,
		);
		expect(evictedStatus).toBe(404);
	});

	it("ends a session that holds no event stream once it has been idle", async () => {
		const onAllSessionsEnded = vi.fn();
		await mcpHttpServer.close();
		mcpHttpServer = await startMcpHttpServer({
			runtime,
			port: 0,
			onAllSessionsEnded,
			idleSessionTimeoutMs: 100,
		});
		const sessionId = await initializeRaw(mcpHttpServer.url);
		await vi.waitFor(() => {
			expect(onAllSessionsEnded).toHaveBeenCalledTimes(1);
		});
		const statusCode = await postRaw(
			mcpHttpServer.url,
			{ "mcp-session-id": sessionId },
			TOOLS_LIST_REQUEST,
		);
		expect(statusCode).toBe(404);
	});

	it("answers an unknown session and an unknown path with 404", async () => {
		const unknownSessionStatus = await postRaw(
			mcpHttpServer.url,
			{ "mcp-session-id": "not-a-session" },
			{ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} },
		);
		expect(unknownSessionStatus).toBe(404);
		const otherPathStatus = await postRaw(
			new URL("/other", mcpHttpServer.url).href,
			{},
			INITIALIZE_REQUEST,
		);
		expect(otherPathStatus).toBe(404);
	});

	it("reports the last session ending when its client ends it", async () => {
		const onAllSessionsEnded = vi.fn();
		await mcpHttpServer.close();
		mcpHttpServer = await startMcpHttpServer({
			runtime,
			port: 0,
			onAllSessionsEnded,
		});
		const firstTransport = new StreamableHTTPClientTransport(
			new URL(mcpHttpServer.url),
		);
		const secondTransport = new StreamableHTTPClientTransport(
			new URL(mcpHttpServer.url),
		);
		const firstClient = new Client({ name: "first", version: "0.0.0" });
		const secondClient = new Client({ name: "second", version: "0.0.0" });
		await firstClient.connect(firstTransport);
		await secondClient.connect(secondTransport);
		openClients.push(firstClient, secondClient);

		await firstTransport.terminateSession();
		expect(onAllSessionsEnded).not.toHaveBeenCalled();
		await secondTransport.terminateSession();
		expect(onAllSessionsEnded).toHaveBeenCalledTimes(1);
	});

	it("ends a session whose client dropped its event stream and stayed away", async () => {
		const onAllSessionsEnded = vi.fn();
		await mcpHttpServer.close();
		mcpHttpServer = await startMcpHttpServer({
			runtime,
			port: 0,
			onAllSessionsEnded,
			abandonedSessionGraceMs: 100,
		});
		const transport = new StreamableHTTPClientTransport(
			new URL(mcpHttpServer.url),
		);
		const client = new Client({ name: "dropping", version: "0.0.0" });
		await client.connect(transport);
		const { sessionId } = transport;
		expect(sessionId).toBeDefined();
		// The client opens its event stream right after connecting, without
		// waiting for it; the session is still whole while it is open
		await new Promise((resolve) => setTimeout(resolve, 300));
		expect(onAllSessionsEnded).not.toHaveBeenCalled();

		// close() drops the stream without a DELETE, as a client that was killed
		// does
		await client.close();
		await vi.waitFor(() => {
			expect(onAllSessionsEnded).toHaveBeenCalledTimes(1);
		});
		const statusCode = await postRaw(
			mcpHttpServer.url,
			{ "mcp-session-id": sessionId ?? "" },
			{ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} },
		);
		expect(statusCode).toBe(404);
	});

	it("stops accepting connections once closed", async () => {
		const client = await connectClient(mcpHttpServer.url);
		await mcpHttpServer.close();
		await expect(client.listTools()).rejects.toThrow();
		await expect(connectClient(mcpHttpServer.url)).rejects.toThrow();
		await client.close();
		// afterEach needs a running server of its own to close
		mcpHttpServer = await startMcpHttpServer({ runtime, port: 0 });
	});
});
