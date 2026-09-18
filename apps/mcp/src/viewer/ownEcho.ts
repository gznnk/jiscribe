/**
 * Whether an incoming doc frame is this page's own write coming back.
 *
 * The text alone does not tell: two freshly created files hold the same empty
 * canvas, so a frame opening another file with that text would pass for an echo
 * and the page would keep the old path. The frame has to name the file this page
 * synced as well.
 *
 * @param incoming The frame's file (workspace-relative) and text
 * @param synced The file this page last synced with the host and the text it holds
 *   for it; null in either means nothing has been synced yet, and then nothing is
 *   an echo
 */
export const isOwnEcho = (
	incoming: { relPath: string; docText: string },
	synced: { openPath: string | null; syncedText: string | null },
): boolean =>
	synced.openPath !== null &&
	synced.syncedText !== null &&
	incoming.relPath === synced.openPath &&
	incoming.docText === synced.syncedText;
