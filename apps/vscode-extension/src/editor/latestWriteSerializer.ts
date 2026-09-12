/**
 * Runs whole-document writes one at a time, keeping only the newest one waiting,
 * extracted from JiscribeEditorProvider so it can be unit-tested without VSCode
 * (the same shape as selfWriteTracker).
 *
 * A WorkspaceEdit records the document's version when it is built and VSCode
 * refuses it at apply time if the version has moved since ("has changed in the
 * meantime", logged as "IGNORING workspace edit"). So a second commit built
 * while the first `applyEdit` is still in flight is refused outright — the user
 * gets a "not saved" error and the canvas and the file drift apart.
 *
 * Waiting writes collapse to the newest text rather than forming a queue,
 * because each commit is the canvas' whole document: a text superseded by a
 * newer one carries nothing the newer one lacks, and writing it first would only
 * put an extra version of the file through the editor's undo history.
 */

/** Serializer over one document's writes; see the module comment. */
export interface LatestWriteSerializer {
	/**
	 * Write a text, after whatever is already in flight.
	 *
	 * @param text - the whole document to write; while a write is in flight this
	 *   replaces any other waiting text, so only the last one before that write
	 *   settles is written. Never throws, whatever the write does
	 */
	enqueue(text: string): void;
}

/**
 * Create a serializer over one write function.
 *
 * @param write - performs one whole-document write; called with nothing else of
 *   its own in flight, and its rejection is swallowed (the provider's write
 *   reports its own failures to the user) so a failed write cannot stop the
 *   waiting text from being written
 * @returns the serializer; it holds at most one waiting text, so it is per
 *   editor and must not be shared between documents
 */
export function createLatestWriteSerializer(
	write: (text: string) => Promise<void>,
): LatestWriteSerializer {
	let isWriteInFlight = false;
	// The single text waiting for the in-flight write, if any.
	let pendingText: string | undefined;

	function startWrite(text: string): void {
		isWriteInFlight = true;
		void writeThenContinue(text);
	}

	async function writeThenContinue(text: string): Promise<void> {
		try {
			await write(text);
		} catch {
			// See the `write` parameter: failures are the caller's to report, and
			// rethrowing here would leave the waiting text unwritten.
		}

		isWriteInFlight = false;
		const nextText = pendingText;
		pendingText = undefined;
		if (nextText !== undefined) {
			startWrite(nextText);
		}
	}

	return {
		enqueue(text: string): void {
			if (isWriteInFlight) {
				pendingText = text;
				return;
			}
			startWrite(text);
		},
	};
}
