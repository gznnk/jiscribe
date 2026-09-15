import { isGeneratedFileContent } from "./generatedFileNotice";

/**
 * "Set up AI"'s cleanup of the `.jiscribe/reference.md` an earlier version
 * generated, minus VSCode: the ownership check and what follows from it.
 * setupAi.ts adapts `vscode.workspace.fs` into the {@link StaleFileAccess}
 * injected here so this half can be unit-tested (the docImageResolution /
 * resolveDocImage split is the same arrangement).
 */

/** The one file being cleaned up, as the two operations the removal needs. */
export interface StaleFileAccess {
	/** Reads the file's bytes; rejecting means it is not there. */
	read: () => Promise<Uint8Array>;
	/** Deletes the file; `useTrash` asks for a recoverable delete. */
	delete: (useTrash: boolean) => Promise<void>;
}

/**
 * What became of the file: never there, ours and gone, the user's and left
 * alone (the only outcome worth reporting), or ours but undeletable.
 */
export type StaleReferenceOutcome = "absent" | "removed" | "kept" | "failed";

/**
 * Drop a `.jiscribe/reference.md` left by an earlier run.
 *
 * reference.md was ours until the guide absorbed it. A copy left from an
 * earlier run is never refreshed again, so drop it rather than let an AI find a
 * stale spec beside the current one — but only the copy we wrote, recognised by
 * the generated notice on its first line. A file without that line is the
 * user's own, and stays.
 *
 * @param file - the file to examine, at `.jiscribe/reference.md`; absent is the normal case
 * @returns which of the four {@link StaleReferenceOutcome} cases happened; never rejects, since leftover cleanup must not fail the command
 */
export async function removeGeneratedReference(
	file: StaleFileAccess,
): Promise<StaleReferenceOutcome> {
	let bytes: Uint8Array;
	try {
		bytes = await file.read();
	} catch {
		return "absent";
	}
	if (!isGeneratedFileContent(bytes)) {
		return "kept";
	}
	try {
		// To the trash first: the copy may have been edited into something the user
		// wants back, and only its first line says it was ever ours.
		await file.delete(true);
	} catch {
		try {
			// Filesystems with no trash (virtual, and some remotes) refuse useTrash.
			await file.delete(false);
		} catch {
			return "failed";
		}
	}
	return "removed";
}
