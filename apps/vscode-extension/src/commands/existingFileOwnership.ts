import { isGeneratedFileContent } from "./generatedFileNotice";

/**
 * Who owns the file standing where "Set up AI" is about to write, minus VSCode.
 * setupAi.ts adapts `vscode.workspace.fs.readFile` into the reader injected
 * here so this half can be unit-tested (the staleReferenceRemoval /
 * removeGeneratedReference split is the same arrangement).
 */

/**
 * What a destination holds: nothing, a copy this command wrote, or a file that
 * was never ours and may only be replaced with the user's say-so.
 */
export type ExistingFileOwnership = "absent" | "generated" | "foreign";

/**
 * Judge the file at a destination the command stamps the generated notice on.
 *
 * Ownership is read off the first line alone (see `isGeneratedFileContent`):
 * a file without the notice is the user's, however much the rest of it looks
 * like something we wrote.
 *
 * @param read - reads the destination's bytes; any rejection counts as "absent", including a file that exists but cannot be read, which the write that follows fails on anyway
 * @returns which of the three {@link ExistingFileOwnership} cases holds; never rejects
 */
export async function classifyExistingFile(
	read: () => Promise<Uint8Array>,
): Promise<ExistingFileOwnership> {
	let bytes: Uint8Array;
	try {
		bytes = await read();
	} catch {
		return "absent";
	}
	return isGeneratedFileContent(bytes) ? "generated" : "foreign";
}
