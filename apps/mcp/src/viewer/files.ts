import {
	buildFileApiUrl,
	REVISION_HEADER,
	REVISION_MISMATCH_STATUS,
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

/** How a write ended, short of an error */
export type SaveFileResult =
	/** The file now holds the text, under this revision */
	| { kind: "saved"; revision: string }
	/**
	 * Nothing was written: the file had moved on from the revision the write
	 * quoted. The newer text follows over the WebSocket as a docChanged frame,
	 * which is what redraws the canvas, so there is nothing to carry back here
	 */
	| { kind: "conflict" };

const readJsonBody = async (response: Response): Promise<unknown> => {
	try {
		return await response.json();
	} catch {
		// A body that is not JSON says nothing the status line does not
		return null;
	}
};

const readStringField = (value: unknown, field: string): string | null => {
	if (typeof value !== "object" || value === null || !(field in value)) {
		return null;
	}
	const fieldValue = (value as Record<string, unknown>)[field];
	return typeof fieldValue === "string" ? fieldValue : null;
};

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
 * @param revision The revision of the text this page last had from the host. The
 *   server writes only on a match, which is what keeps this write from landing on
 *   top of an edit made somewhere else in the meantime
 * @returns The new revision on a write that landed, or the bare conflict when the
 *   file had moved on. A conflict is not to be retried
 * @throws An Error carrying the error message the server returned, which covers a
 *   write refused for any other reason (no token, the wrong file, a missing
 *   If-Match)
 */
export async function saveFile(
	relPath: string,
	text: string,
	sessionToken: string | null,
	revision: string,
): Promise<SaveFileResult> {
	if (sessionToken === null) {
		throw new Error("the canvas host has not been reached yet");
	}
	const response = await fetch(buildFileApiUrl(relPath), {
		method: "PUT",
		headers: {
			[SESSION_TOKEN_HEADER]: sessionToken,
			[REVISION_HEADER]: revision,
		},
		body: text,
	});
	const body = await readJsonBody(response);
	if (response.ok) {
		const savedRevision = readStringField(body, "revision");
		if (savedRevision === null) {
			throw new Error("the canvas host took the write without a revision");
		}
		return { kind: "saved", revision: savedRevision };
	}
	if (response.status === REVISION_MISMATCH_STATUS) {
		return { kind: "conflict" };
	}
	throw new Error(
		readStringField(body, "error") ??
			`${response.status} ${response.statusText}`,
	);
}
