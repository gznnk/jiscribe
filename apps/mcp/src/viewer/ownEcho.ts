/**
 * Which document a doc frame belongs to: the file, and the host it came from.
 *
 * The path alone does not tell. A file of the same name in another directory is
 * served by another host (the host restarts on the new directory and the page
 * reconnects on its own), and it arrives under the same workspace-relative path.
 * Each host hands out a token of its own, so the pair tells them apart, while a
 * reconnect to the same host — a dropped network, a tab woken from sleep — keeps
 * both and so stays the same document.
 */
export type DocIdentity = {
	/** The session token of the host the frame arrived from */
	sessionToken: string;
	/** Workspace-relative path of the file, as that host names it */
	relPath: string;
};

/**
 * Whether two identities name the same document.
 *
 * @param left One identity; null (nothing synced yet) matches nothing, itself
 *   included
 * @param right The other, under the same rule
 */
export const isSameDoc = (
	left: DocIdentity | null,
	right: DocIdentity | null,
): boolean =>
	left !== null &&
	right !== null &&
	left.sessionToken === right.sessionToken &&
	left.relPath === right.relPath;

/**
 * The key the canvas is given as its `docLoadId`, which drops the undo history
 * whenever it changes.
 *
 * @param identity The document drawn; null while none has arrived
 * @returns A distinct string per identity, or undefined for null
 */
export const calcDocLoadId = (
	identity: DocIdentity | null,
): string | undefined =>
	identity === null
		? undefined
		: JSON.stringify([identity.sessionToken, identity.relPath]);

/**
 * Whether an incoming doc frame is this page's own write coming back.
 *
 * The text alone does not tell: two freshly created files hold the same empty
 * canvas, so a frame opening another file with that text would pass for an echo
 * and the page would keep the old document. The frame has to name the document
 * this page synced as well (see DocIdentity for what that takes).
 *
 * @param incoming The frame's document and text
 * @param synced The document this page last synced with the host and the text it
 *   holds for it; null in either means nothing has been synced yet, and then
 *   nothing is an echo
 */
export const isOwnEcho = (
	incoming: { identity: DocIdentity; docText: string },
	synced: { identity: DocIdentity | null; syncedText: string | null },
): boolean =>
	synced.syncedText !== null &&
	isSameDoc(incoming.identity, synced.identity) &&
	incoming.docText === synced.syncedText;
