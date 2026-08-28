/**
 * Writes the canvas a person fixed back to the workspace.
 *
 * There is no counterpart for reading. What the viewer displays arrives over the
 * WebSocket, so there is no need to read a file over HTTP.
 *
 * @param relPath Path relative to the workspace root. A path leading outside is
 *   rejected by the server
 * @param text The text to write (the whole `.jis.json`)
 * @throws An Error carrying the error message the server returned
 */
export async function saveFile(relPath: string, text: string): Promise<void> {
	const response = await fetch(
		`/api/file?path=${encodeURIComponent(relPath)}`,
		{ method: "PUT", body: text },
	);
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
