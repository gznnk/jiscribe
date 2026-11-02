/**
 * How long a flush waits for a drag that edits the document to be let go before it
 * answers. The canvas has no way to end a drag from outside, and the host gives up
 * on the flush after 3 seconds, which leaves the rest for the commit and the write
 */
export const DRAG_RELEASE_WAIT_MS = 1_500;
