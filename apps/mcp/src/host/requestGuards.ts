// Who the canvas host answers to. Both the HTTP routes and the WebSocket upgrade
// put a request through these before anything else: the host listens on the
// loopback only, and a request that reaches it under another name is a page on
// some site that rebound its DNS name to this machine.

/**
 * The names this server answers to. Everything else is a name that resolved to
 * 127.0.0.1 without being one of ours, which is what DNS rebinding looks like
 */
const loopbackHostNames: readonly string[] = [
	"localhost",
	"127.0.0.1",
	"[::1]",
];

/**
 * Splits a Host header into the name and the port written on it.
 *
 * @param hostHeader The header as it arrived, which for IPv6 carries the brackets
 * @returns The name (brackets kept) and the port as written, or null when the
 *   header is not a host at all — a malformed one reaches here as readily as a
 *   browser's does
 */
const splitHostHeader = (
	hostHeader: string,
): { name: string; port: string | null } | null => {
	if (hostHeader.startsWith("[")) {
		const closingIndex = hostHeader.indexOf("]");
		if (closingIndex < 0) {
			return null;
		}
		const name = hostHeader.slice(0, closingIndex + 1);
		const rest = hostHeader.slice(closingIndex + 1);
		if (rest === "") {
			return { name, port: null };
		}
		return rest.startsWith(":") ? { name, port: rest.slice(1) } : null;
	}
	const colonIndex = hostHeader.indexOf(":");
	if (colonIndex < 0) {
		return { name: hostHeader, port: null };
	}
	// A second colon means an IPv6 address written without its brackets, which is
	// not a Host header any browser composes
	if (hostHeader.includes(":", colonIndex + 1)) {
		return null;
	}
	return {
		name: hostHeader.slice(0, colonIndex),
		port: hostHeader.slice(colonIndex + 1),
	};
};

/**
 * Whether a request's Host header names this server itself.
 *
 * @param hostHeader The Host header as it arrived, or undefined when there is none
 *   (HTTP/1.1 requires one, so a request without it is refused)
 * @param listeningPort The port the request arrived on. A Host header carrying any
 *   other port is refused; one carrying no port at all is taken as this server
 * @returns Whether the request may be answered
 */
export function isAllowedHostHeader(
	hostHeader: string | undefined,
	listeningPort: number,
): boolean {
	if (hostHeader === undefined) {
		return false;
	}
	const parsed = splitHostHeader(hostHeader);
	if (parsed === null) {
		return false;
	}
	if (!loopbackHostNames.includes(parsed.name.toLowerCase())) {
		return false;
	}
	return parsed.port === null || parsed.port === String(listeningPort);
}

/**
 * Whether an Origin header is this server's own origin.
 *
 * @param originHeader The Origin header as it arrived. A page always sends one on a
 *   write and on a WebSocket, so an absent one stands for a client that is not a
 *   browser (curl, a test) and is left to the caller to allow
 * @param listeningPort The port the request arrived on, which the origin has to
 *   name (a bare `http://localhost` counts as port 80)
 * @returns Whether the origin is this server's own
 */
export function isAllowedOrigin(
	originHeader: string,
	listeningPort: number,
): boolean {
	let originUrl: URL;
	try {
		originUrl = new URL(originHeader);
	} catch {
		return false;
	}
	if (originUrl.protocol !== "http:") {
		return false;
	}
	if (!loopbackHostNames.includes(originUrl.hostname.toLowerCase())) {
		return false;
	}
	const originPort = originUrl.port === "" ? 80 : Number(originUrl.port);
	return originPort === listeningPort;
}
