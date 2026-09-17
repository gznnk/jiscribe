import {
	buildFileApiUrl,
	SESSION_API_PATHNAME,
	SESSION_TOKEN_HEADER,
} from "../shared/fileApiRoute";

/**
 * Reads this host's session token, which every write has to carry.
 *
 * Only a page on the host's own origin can read the answer, since no CORS header
 * is ever sent, and the token is a fresh one per host — so a window left over from
 * an earlier host on this port is refused until it has been here again.
 *
 * @returns The token to send on a write and on the WebSocket URL
 * @throws An Error when the host did not answer with a token, which is what a host
 *   that has gone away looks like
 */
export async function fetchSessionToken(): Promise<string> {
	const response = await fetch(SESSION_API_PATHNAME, { cache: "no-store" });
	if (!response.ok) {
		throw new Error(`${response.status} ${response.statusText}`);
	}
	const body: unknown = await response.json();
	if (
		typeof body !== "object" ||
		body === null ||
		!("token" in body) ||
		typeof body.token !== "string"
	) {
		throw new Error("the canvas host answered without a session token");
	}
	return body.token;
}

/**
 * Writes the canvas a person fixed back to the workspace.
 *
 * The doc itself is never read back through HTTP — it arrives over the WebSocket.
 * The only read is for the images an object points at (`./resolveDocImage`).
 *
 * @param relPath Path relative to the workspace root. A path leading outside, or
 *   one other than the file on display, is rejected by the server
 * @param text The text to write (the whole `.jis`)
 * @param sessionToken The token from `fetchSessionToken`. null stands for a page
 *   that has not reached the host yet, and the write is not even attempted
 * @throws An Error carrying the error message the server returned
 */
export async function saveFile(
	relPath: string,
	text: string,
	sessionToken: string | null,
): Promise<void> {
	if (sessionToken === null) {
		throw new Error("the canvas host has not been reached yet");
	}
	const response = await fetch(buildFileApiUrl(relPath), {
		method: "PUT",
		headers: { [SESSION_TOKEN_HEADER]: sessionToken },
		body: text,
	});
	if (response.ok) {
		return;
	}
	let message = `${response.status} ${response.statusText}`;
	try {
		const body: unknown = await response.json();
		if (
			typeof body === "object" &&
			body !== null &&
			"error" in body &&
			typeof body.error === "string"
		) {
			message = body.error;
		}
	} catch {
		// An error body that is not JSON is reported as the status line it came as
	}
	throw new Error(message);
}
