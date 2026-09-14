/**
 * The marker "Set up AI" stamps on the files it generates, and the test that
 * reads it back to tell those files apart from a user's own. Kept out of
 * setupAi.ts, which imports vscode, so the test can be a unit test.
 */

/** Header marking a generated file (discourages manual edits). */
export const GENERATED_NOTICE =
	"<!-- Generated and managed by the Jiscribe extension's “Set up AI” command. Manual edits are overwritten on re-run. -->";

// Enough bytes to hold the notice plus its line break: a cut that far in cannot
// land inside a character of the first line.
const NOTICE_HEAD_BYTES = new TextEncoder().encode(GENERATED_NOTICE).length + 8;

/**
 * Whether a file's bytes are ones "Set up AI" wrote into `.jiscribe/`, judged
 * by {@link GENERATED_NOTICE} standing alone on the first line. Anything else
 * is the user's, however familiar the rest of the file looks.
 *
 * @param bytes - the file's contents, UTF-8 (a BOM is ignored, and bytes that are not text simply fail to match)
 * @returns true only when the first line is exactly the notice, trailing CR and spaces aside
 */
export function isGeneratedFileContent(bytes: Uint8Array): boolean {
	const head = new TextDecoder().decode(bytes.subarray(0, NOTICE_HEAD_BYTES));
	return head.split("\n", 1)[0].trimEnd() === GENERATED_NOTICE;
}
