import {
	buildFileApiUrl,
	INVALID_SESSION_STATUS,
	NOT_ON_DISPLAY_STATUS,
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
	| { kind: "conflict" }
	/**
	 * Nothing was written, and nothing for this document ever will be: the host has
	 * moved on to another file, or is another host than the one the doc came from
	 * (a switch to another directory restarts it). Not to be sent again
	 */
	| { kind: "document-gone" }
	/**
	 * Nothing was written, for a reason the message gives. Transient when the same
	 * write may go through if sent again unchanged: the host could not be reached, or
	 * failed on its side (see {@link isTransientWriteStatus})
	 */
	| { kind: "failed"; message: string; isTransient: boolean };

/**
 * Whether a write the host answered with this status may go through if sent again
 * unchanged.
 *
 * Only the host failing on its side (5xx) and the two statuses that say "later"
 * (408, 429) are. Every other refusal is about the write itself and would be
 * answered the same way again: a stale session token after the host restarted
 * (401), a file no longer on display (409), a file that may not be written to
 * (403), a body the host will not take (413, 422), a missing revision (428). A
 * revision that no longer matches (412) is a conflict, which is never to be sent
 * again.
 *
 * @param status The HTTP status of an answer that was not a success
 */
export const isTransientWriteStatus = (status: number): boolean =>
	(status >= 500 && status <= 599) || status === 408 || status === 429;

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
 * @param sessionToken The token of the host the text was read from, as
 *   `fetchSessionToken` got it. A host restarted since refuses it, so the write
 *   cannot reach a file of the same name that another host now serves
 * @param revision The revision of the text this page last had from the host. The
 *   server writes only on a match, which is what keeps this write from landing on
 *   top of an edit made somewhere else in the meantime
 * @returns The new revision on a write that landed, the bare conflict when the
 *   file had moved on (not to be retried), document-gone when the host no longer
 *   takes writes for the document at all, or the failure — the network error, or
 *   the error message the server returned for any other refusal — together with
 *   whether sending it again may help
 * @throws An Error when the host took the write but answered without a revision,
 *   which no host speaking this protocol does
 */
export async function saveFile(
	relPath: string,
	text: string,
	sessionToken: string,
	revision: string,
): Promise<SaveFileResult> {
	let response: Response;
	try {
		response = await fetch(buildFileApiUrl(relPath), {
			method: "PUT",
			headers: {
				[SESSION_TOKEN_HEADER]: sessionToken,
				[REVISION_HEADER]: revision,
			},
			body: text,
		});
	} catch (error) {
		// fetch rejects only when no answer came back at all: offline, the host gone
		// or restarting, the request cut off
		return { kind: "failed", message: String(error), isTransient: true };
	}
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
	if (
		response.status === INVALID_SESSION_STATUS ||
		response.status === NOT_ON_DISPLAY_STATUS
	) {
		return { kind: "document-gone" };
	}
	return {
		kind: "failed",
		message:
			readStringField(body, "error") ??
			`${response.status} ${response.statusText}`,
		isTransient: isTransientWriteStatus(response.status),
	};
}
