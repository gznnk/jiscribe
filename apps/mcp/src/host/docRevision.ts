import { createHash } from "node:crypto";

/**
 * The revision a text is handed out under, and has to be named by again when it is
 * written back. diagnose_canvas computes it the same way to tell whether the
 * viewer measured the very text it diagnosed.
 *
 * @param docText The text as the viewer was given it, or as it was just written
 *   or read
 * @returns The lowercase hex SHA-256 of the text's UTF-8 bytes
 */
export const calcDocRevision = (docText: string): string =>
	createHash("sha256").update(docText, "utf8").digest("hex");
