// The MCP endpoint AI clients connect to by URL. Every client session gets an
// McpServer of its own over the one runtime, so they all act on the same canvas
// host, file locks and undo history. Nothing in here imports electron, which is
// what lets vitest load it.

import { randomUUID } from "node:crypto";
import http from "node:http";
import type { AddressInfo } from "node:net";

import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
	createJiscribeMcpServer,
	listenOnAvailablePort,
	type JiscribeMcpRuntime,
} from "jiscribe-mcp/server";

/** The port tried first; the canvas host starts from 5190 */
const DEFAULT_MCP_PORT = 5191;

const MCP_PATH = "/mcp";

const SESSION_ID_HEADER = "mcp-session-id";

/**
 * How long a session whose event stream has dropped is kept for its client to
 * open the stream again. The SDK client retries within a few seconds; a client
 * that stays away this long has gone without saying so.
 */
const DEFAULT_ABANDONED_SESSION_GRACE_MS = 30_000;

/**
 * How many sessions may exist at once. Anything on the machine can reach the
 * endpoint, and every session holds an McpServer, so a client that keeps
 * initializing is stopped here instead of growing memory. Checked before the
 * SDK has registered the session, so a burst of first requests can overshoot
 */
const MAX_SESSION_COUNT = 64;

/**
 * How long a session with no event stream is kept without a request before it
 * counts as abandoned: the only way a client that never opens the stream and
 * never ends its session lets go of its slot
 */
const DEFAULT_IDLE_SESSION_TIMEOUT_MS = 10 * 60_000;

export type StartMcpHttpServerOptions = {
	/** What every session's tools act through; it is not closed by close() */
	runtime: JiscribeMcpRuntime;
	/**
	 * The port tried first, stepping up past ones in use (default 5191). 0 takes
	 * whatever port the OS hands out
	 */
	port?: number;
	/**
	 * Called each time the last session ends, whether its client ended it or
	 * stayed away past `abandonedSessionGraceMs`. Not called by close()
	 */
	onAllSessionsEnded?: () => void;
	/**
	 * How long a session is kept once its client's event stream (the GET it holds
	 * open for server messages) has dropped and not come back (default 30 s). A
	 * client that never opens one is kept until it ends the session itself, or
	 * until `idleSessionTimeoutMs` passes without a request from it
	 */
	abandonedSessionGraceMs?: number;
	/**
	 * How long a session that holds no event stream is kept without a request
	 * (default 10 min). Checked once a minute, or as often as this when it is
	 * shorter
	 */
	idleSessionTimeoutMs?: number;
};

export type McpHttpServer = {
	/** The endpoint to give an AI client, `http://127.0.0.1:<port>/mcp` */
	url: string;
	/**
	 * Ends every session and stops listening. Open SSE streams are cut rather
	 * than waited for
	 */
	close: () => Promise<void>;
};

type Session = {
	transport: StreamableHTTPServerTransport;
	/** The GET requests being answered right now, streaming or refused alike */
	openStreamCount: number;
	/** Runs once the client has stayed away long enough to count as gone */
	abandonTimer: NodeJS.Timeout | null;
	/** When the session's last request arrived (Date.now()) */
	lastRequestAt: number;
};

/**
 * Reads one header that may have been sent more than once.
 *
 * @returns The first value, or undefined when it was not sent
 */
const readSingleHeader = (
	value: string | string[] | undefined,
): string | undefined => (Array.isArray(value) ? value[0] : value);

/**
 * Answer a request with a JSON-RPC error and no session behind it.
 *
 * @param statusCode The HTTP status: 400 for a request that needs a session and
 *   names none or cannot be read, 403 for a browser page's request, 404 for an
 *   unknown session or path, 503 when no more sessions are taken, 500 for a
 *   request whose handling threw before anything was sent
 */
const respondWithError = (
	response: http.ServerResponse,
	statusCode: number,
	message: string,
): void => {
	response.writeHead(statusCode, { "Content-Type": "application/json" });
	response.end(
		JSON.stringify({
			jsonrpc: "2.0",
			error: { code: -32000, message },
			id: null,
		}),
	);
};

const clearAbandonTimer = (session: Session): void => {
	if (session.abandonTimer !== null) {
		clearTimeout(session.abandonTimer);
		session.abandonTimer = null;
	}
};

/**
 * Start the Streamable HTTP endpoint on 127.0.0.1.
 *
 * @param options The runtime the sessions share, the port to start from, and
 *   what to do once the last client has gone
 * @returns The endpoint's URL, and how to stop it
 * @throws CanvasHostError When every port in the 20 from `port` up is taken
 */
export async function startMcpHttpServer(
	options: StartMcpHttpServerOptions,
): Promise<McpHttpServer> {
	const abandonedSessionGraceMs =
		options.abandonedSessionGraceMs ?? DEFAULT_ABANDONED_SESSION_GRACE_MS;
	const idleSessionTimeoutMs =
		options.idleSessionTimeoutMs ?? DEFAULT_IDLE_SESSION_TIMEOUT_MS;
	const sessionById = new Map<string, Session>();

	const endSession = (session: Session): void => {
		session.transport.close().catch((error: unknown) => {
			console.error("failed to end an MCP session:", error);
		});
	};

	/** The sessions holding no event stream, the longest without a request first */
	const listStreamlessSessions = (): Session[] =>
		[...sessionById.values()]
			.filter((session) => session.openStreamCount === 0)
			.sort((first, second) => first.lastRequestAt - second.lastRequestAt);

	const idleSweep = setInterval(
		() => {
			const idleSince = Date.now() - idleSessionTimeoutMs;
			for (const session of listStreamlessSessions()) {
				if (session.lastRequestAt <= idleSince) {
					endSession(session);
				}
			}
		},
		Math.min(60_000, idleSessionTimeoutMs),
	);
	idleSweep.unref();
	// Known only once listening, and needed by the transports' Host check
	let allowedHosts: string[] = [];

	/**
	 * Make the transport for a client that has not started a session yet. It
	 * joins the map once the SDK has answered the initialize request; a first
	 * request that is not an initialize is refused by the transport itself.
	 */
	const createSessionTransport =
		async (): Promise<StreamableHTTPServerTransport> => {
			const transport = new StreamableHTTPServerTransport({
				sessionIdGenerator: randomUUID,
				enableDnsRebindingProtection: true,
				allowedHosts,
				onsessioninitialized: (sessionId) => {
					sessionById.set(sessionId, {
						transport,
						openStreamCount: 0,
						abandonTimer: null,
						lastRequestAt: Date.now(),
					});
				},
			});
			// Set before connect, which chains its own handler after this one
			transport.onclose = () => {
				const sessionId = transport.sessionId;
				if (sessionId === undefined) {
					return;
				}
				const session = sessionById.get(sessionId);
				// close() below empties the map before it closes the transports, so
				// a session ending that way does not count as the last client leaving
				if (session === undefined || session.transport !== transport) {
					return;
				}
				clearAbandonTimer(session);
				sessionById.delete(sessionId);
				if (sessionById.size === 0) {
					options.onAllSessionsEnded?.();
				}
			};
			await createJiscribeMcpServer({ runtime: options.runtime }).connect(
				transport,
			);
			return transport;
		};

	/**
	 * Watch the GET a client holds open for server messages. The SDK client
	 * opens it right after initializing and reopens it when it drops, so a
	 * session whose stream stays gone has lost its client, and is ended in its
	 * client's stead. Only a GET the transport accepted (200) counts as a stream:
	 * a refused one ends at once without saying anything about the client, and
	 * must neither start nor stop the countdown. The timer is therefore left
	 * running and looks again when it fires, rather than being cleared by a GET
	 * that may turn out to be refused.
	 */
	const trackEventStream = (
		sessionId: string,
		session: Session,
		response: http.ServerResponse,
	): void => {
		session.openStreamCount += 1;
		response.on("close", () => {
			session.openStreamCount -= 1;
			const wasStream = response.headersSent && response.statusCode === 200;
			if (
				!wasStream ||
				session.openStreamCount > 0 ||
				session.abandonTimer !== null ||
				sessionById.get(sessionId) !== session
			) {
				return;
			}
			session.abandonTimer = setTimeout(() => {
				session.abandonTimer = null;
				if (session.openStreamCount === 0) {
					endSession(session);
				}
			}, abandonedSessionGraceMs);
		});
	};

	const handleMcpRequest = async (
		request: http.IncomingMessage,
		response: http.ServerResponse,
	): Promise<void> => {
		const sessionId = readSingleHeader(request.headers[SESSION_ID_HEADER]);
		if (sessionId !== undefined) {
			const session = sessionById.get(sessionId);
			if (session === undefined) {
				respondWithError(response, 404, "Session not found");
				return;
			}
			session.lastRequestAt = Date.now();
			if (request.method === "GET") {
				trackEventStream(sessionId, session, response);
			}
			await session.transport.handleRequest(request, response);
			return;
		}
		if (request.method !== "POST") {
			respondWithError(response, 400, "Bad Request: no session ID");
			return;
		}
		if (sessionById.size >= MAX_SESSION_COUNT) {
			// A session that holds no stream may be a client that left without
			// a word; the one quiet the longest gives way, so a stream-holding
			// client is never locked out by them
			const [oldestStreamless] = listStreamlessSessions();
			if (oldestStreamless === undefined) {
				respondWithError(response, 503, "Too many sessions");
				return;
			}
			await oldestStreamless.transport.close();
		}
		const transport = await createSessionTransport();
		await transport.handleRequest(request, response);
	};

	const httpServer = http.createServer((request, response) => {
		let pathname: string;
		try {
			pathname = new URL(request.url ?? "/", "http://127.0.0.1").pathname;
		} catch {
			respondWithError(response, 400, "Bad Request: malformed URL");
			return;
		}
		if (pathname !== MCP_PATH) {
			respondWithError(response, 404, "Not Found");
			return;
		}
		// An Origin header means a browser page sent this. No page has business
		// here, and the preflight a browser would make first is not something to
		// rely on (the transport's Host check only stops DNS rebinding)
		if (request.headers.origin !== undefined) {
			respondWithError(response, 403, "Forbidden: browser origin");
			return;
		}
		handleMcpRequest(request, response).catch((error: unknown) => {
			console.error("MCP request failed:", error);
			if (!response.headersSent) {
				respondWithError(response, 500, "Internal server error");
			} else {
				response.end();
			}
		});
	});

	await listenOnAvailablePort(httpServer, options.port ?? DEFAULT_MCP_PORT);
	// Port 0 is listened on as whatever the OS picked, so the address is read back
	const { port } = httpServer.address() as AddressInfo;
	allowedHosts = [`127.0.0.1:${port}`, `localhost:${port}`];

	return {
		url: `http://127.0.0.1:${port}${MCP_PATH}`,
		close: async () => {
			clearInterval(idleSweep);
			const sessions = [...sessionById.values()];
			sessionById.clear();
			for (const session of sessions) {
				clearAbandonTimer(session);
			}
			await Promise.all(sessions.map((session) => session.transport.close()));
			await new Promise<void>((resolve, reject) => {
				httpServer.close((error) => {
					if (error !== undefined) {
						reject(error);
						return;
					}
					resolve();
				});
				httpServer.closeAllConnections();
			});
		},
	};
}
