/**
 * Runs whole-document writes one at a time, keeping only the newest one waiting,
 * extracted from JiscribeEditorProvider so it can be unit-tested without VSCode
 * (the same shape as selfWriteTracker).
 *
 * `applyEdit` stamps the edit with the document version the extension host
 * knows at the call, and VSCode refuses it if the document has moved past that
 * version ("has changed in the meantime", logged as "IGNORING workspace edit").
 * The change event of a write reaches the extension host after the write is
 * issued, so a second `applyEdit` called while the first is still in flight
 * carries the version from before it and is refused outright — the user gets a
 * "not saved" error and the canvas and the file drift apart.
 *
 * Waiting writes collapse to the newest text rather than forming a queue,
 * because each commit is the canvas' whole document: a text superseded by a
 * newer one carries nothing the newer one lacks, and writing it first would only
 * put an extra version of the file through the editor's undo history.
 */

/** Serializer over one document's writes; see the module comment. */
export interface LatestWriteSerializer<TWrite> {
	/**
	 * Write, after whatever is already in flight.
	 *
	 * @param write - the whole document to write, with whatever the writer needs
	 *   beside it; while a write is in flight this replaces any other waiting one,
	 *   so only the last enqueued before that write settles is written. Never
	 *   throws, whatever the write does
	 */
	enqueue(write: TWrite): void;
}

/**
 * Create a serializer over one write function.
 *
 * @param performWrite - performs one whole-document write; called with nothing
 *   else of its own in flight, and its rejection is swallowed (the provider's
 *   write reports its own failures to the user) so a failed write cannot stop
 *   the waiting one from being written
 * @returns the serializer; it holds at most one waiting write, so it is per
 *   editor and must not be shared between documents
 */
export function createLatestWriteSerializer<TWrite>(
	performWrite: (write: TWrite) => Promise<void>,
): LatestWriteSerializer<TWrite> {
	let isWriteInFlight = false;
	// The single write waiting for the in-flight one, if any.
	let pendingWrite: TWrite | undefined;

	function startWrite(write: TWrite): void {
		isWriteInFlight = true;
		void writeThenContinue(write);
	}

	async function writeThenContinue(write: TWrite): Promise<void> {
		try {
			await performWrite(write);
		} catch {
			// See `performWrite`: failures are the caller's to report, and rethrowing
			// here would leave the waiting write unwritten.
		}

		isWriteInFlight = false;
		const nextWrite = pendingWrite;
		pendingWrite = undefined;
		if (nextWrite !== undefined) {
			startWrite(nextWrite);
		}
	}

	return {
		enqueue(write: TWrite): void {
			if (isWriteInFlight) {
				pendingWrite = write;
				return;
			}
			startWrite(write);
		},
	};
}
