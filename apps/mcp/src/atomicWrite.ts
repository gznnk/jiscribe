import { randomUUID } from "node:crypto";
import { chmod, rename, rm, stat, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";

/**
 * Replace a file without letting anyone see it half written.
 *
 * Writes to a temporary file in the same directory and then renames it. A rename
 * within one filesystem is atomic, so a reader only ever sees the file with
 * either the old contents or the new ones. Overwriting directly with `writeFile`
 * can be read at whatever length it has reached mid-write.
 *
 * What this guards is not what pathLock (src/pathLock.ts) guards. That one
 * prevents tools from cutting in on each other, and the host's file watcher and
 * outside editors do not go through it. This one holds for every reader, by
 * whichever route.
 *
 * The temporary file is given a name starting with a dot, and is removed when the
 * write fails. It is left behind only when the process is killed, and that
 * leftover cannot be mistaken for the real thing (it does not end in `.jis.json`,
 * so it is not picked up as a canvas).
 *
 * When the destination already exists, its permissions are carried over. Without
 * that, the newly created file keeps the default mode (from umask), which can be
 * looser than the original.
 *
 * When the destination is a symbolic link, the link itself is replaced by an
 * ordinary file (overwriting directly would rewrite what the link points at).
 * Using a link for a `.jis.json` is not an intended use, so resolving it is not
 * taken on.
 *
 * @param filePath The destination to replace. Its parent directory must exist
 * @param contents The contents to write
 * @throws The reason the write or the replacement failed; filePath is left as it was
 */
export async function writeFileAtomically(
	filePath: string,
	contents: string | Uint8Array,
): Promise<void> {
	const tempPath = join(
		dirname(filePath),
		`.${basename(filePath)}.${randomUUID()}.tmp`,
	);
	// With no destination file this is a fresh creation, so the default mode stands
	const previousMode = await stat(filePath)
		.then((stats) => stats.mode)
		.catch(() => null);
	try {
		await writeFile(tempPath, contents);
		if (previousMode !== null) {
			await chmod(tempPath, previousMode);
		}
		await rename(tempPath, filePath);
	} catch (error) {
		await rm(tempPath, { force: true });
		throw error;
	}
}
