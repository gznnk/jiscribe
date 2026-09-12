/**
 * Tells the echo of the extension's own write apart from a real external change,
 * extracted from JiscribeEditorProvider so it can be unit-tested without VSCode
 * (the same shape as imageDocumentOps).
 *
 * Every canvas edit is written back with `applyEdit`, and that write comes back
 * as an `onDidChangeTextDocument` event. Forwarded to the webview, such an event
 * is applied as an external change, and one that lands after a newer commit
 * reverts the canvas to the older document, so the provider has to recognize
 * its own writes. It used to do that by counting in-flight writes and
 * carrying a single save nonce, which left two gaps (issue #29): a genuine
 * external change landing while a write was in flight was dropped as an echo,
 * and two overlapping commits shifted the nonces by one, so the canvas reloaded
 * its own save as an external change.
 *
 * Both gaps close by classifying on content instead: a change event whose text
 * is one the extension wrote is an echo, anything else is external. Self echoes
 * are never forwarded — the canvas already holds that state.
 *
 * A non-matching event empties the queue, which is the non-obvious part. That
 * event is an external change and will be forwarded, so the canvas is about to
 * be replaced by the external document; the still-pending echo of an older write
 * arriving after that is new information for the canvas and has to be forwarded
 * too, or the canvas would stay on the external document while the file holds
 * our write.
 */

/** Line ending a text document stores, as the two strings VSCode normalizes to. */
export type DocumentEndOfLine = "\n" | "\r\n";

/** Queue of writes made by the extension whose change event has not arrived yet. */
export interface SelfWriteTracker {
	/**
	 * Record a text about to be written via applyEdit.
	 *
	 * @param text - the text handed to applyEdit, with "\n" line separators
	 * @param endOfLine - the target document's line ending, which the stored text
	 *   is normalized to
	 * @returns the normalized text as the document will hold it; pass it to
	 *   {@link SelfWriteTracker.untrack} if the write fails
	 */
	track(text: string, endOfLine: DocumentEndOfLine): string;
	/**
	 * Forget a tracked write that never reached the document (applyEdit resolved
	 * false or rejected). Removes the oldest entry with that text only, so an
	 * identical write still in flight stays tracked.
	 *
	 * @param trackedText - the value {@link SelfWriteTracker.track} returned
	 */
	untrack(trackedText: string): void;
	/**
	 * Classify a change event by the document's text, consuming the queue.
	 *
	 * A match drops that entry and every older one, so an older write whose echo
	 * never arrived cannot linger and swallow a later external change of the same
	 * text; no match empties the queue (see the module comment).
	 *
	 * @param documentText - the document's full text after the change event
	 * @returns true when the text is one this extension wrote, false for an
	 *   external change
	 */
	isSelfWrite(documentText: string): boolean;
}

export function createSelfWriteTracker(): SelfWriteTracker {
	// Texts written but not yet seen coming back, in write order.
	const pendingTexts: string[] = [];

	return {
		track(text: string, endOfLine: DocumentEndOfLine): string {
			// applyEdit normalizes the inserted text to the document's line ending, so
			// a CRLF file gives back "\r\n" where we wrote "\n". JSON.stringify emits
			// raw "\n" only as pretty-print separators (newlines inside strings are
			// escaped), so replacing every "\n" reproduces what the document holds.
			// Done once here rather than per change event.
			const trackedText =
				endOfLine === "\r\n" ? text.replaceAll("\n", "\r\n") : text;
			pendingTexts.push(trackedText);
			return trackedText;
		},

		untrack(trackedText: string): void {
			const index = pendingTexts.indexOf(trackedText);
			if (index !== -1) {
				pendingTexts.splice(index, 1);
			}
		},

		isSelfWrite(documentText: string): boolean {
			// Plain string equality: it short-circuits on length, and comparing a few
			// hundred KB is microseconds. Parsing the JSON here would cost far more.
			const index = pendingTexts.indexOf(documentText);
			if (index === -1) {
				pendingTexts.length = 0;
				return false;
			}
			pendingTexts.splice(0, index + 1);
			return true;
		},
	};
}
