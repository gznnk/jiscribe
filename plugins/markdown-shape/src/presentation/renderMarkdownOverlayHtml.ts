import { renderMarkdown } from "@jiscribe/markdown";

/**
 * The HTML the overlay draws a body as. Nothing is drawn while editing and the
 * draft changes per keystroke, so the body is not rendered then.
 *
 * @param source - The body's Markdown source; "" renders nothing
 * @param isEditing - Whether the body is open in the text editor; true gives "" whatever the source
 * @returns The sanitized HTML (sanitization is renderMarkdown's), or "" when there is nothing to draw
 */
export const renderMarkdownOverlayHtml = (
	source: string,
	isEditing: boolean,
): string => (isEditing || source === "" ? "" : renderMarkdown(source));
