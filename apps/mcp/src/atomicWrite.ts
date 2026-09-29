import { randomUUID } from "node:crypto";
import { constants } from "node:fs";
import type { BigIntStats } from "node:fs";
import {
	access,
	chmod,
	open,
	rename,
	rm,
	stat,
	writeFile,
} from "node:fs/promises";
import { basename, dirname, join } from "node:path";

import { isErrnoWithCode } from "./nodeErrors";

/**
 * What a file on disk was when it was looked at: enough to tell, later, that it
 * has since been written, replaced or removed. Compare two with
 * {@link isSameFileIdentity}.
 */
export type FileIdentity = {
	/** The device the file lives on */
	dev: bigint;
	/** The inode; a rename over the path (an atomic save) changes it */
	ino: bigint;
	/** The size in bytes */
	size: bigint;
	/** The last modification, in nanoseconds since the epoch */
	mtimeNs: bigint;
	/**
	 * The last status change, in nanoseconds since the epoch. Moves on every
	 * write and chmod, and cannot be set back by the writer as mtime can
	 */
	ctimeNs: bigint;
};

const toFileIdentity = (stats: BigIntStats): FileIdentity => ({
	dev: stats.dev,
	ino: stats.ino,
	size: stats.size,
	mtimeNs: stats.mtimeNs,
	ctimeNs: stats.ctimeNs,
});

/**
 * Whether two looks at a file saw the same file, unwritten in between.
 *
 * Timestamps are only as fine as the filesystem keeps them. Where they are
 * coarse (a clock tick rather than nanoseconds), an in-place rewrite to the same
 * size within one tick of the first look cannot be told apart. Linux 6.13 and
 * later hand out a finer stamp to the first change after a stat, which covers
 * that case on the filesystems that support it.
 *
 * @param left One look, or null for a file that was not there
 * @param right The other, in the same form
 * @returns true when both saw no file, or both saw the same inode with the same
 *   size and timestamps
 */
export const isSameFileIdentity = (
	left: FileIdentity | null,
	right: FileIdentity | null,
): boolean => {
	if (left === null || right === null) {
		return left === right;
	}
	return (
		left.dev === right.dev &&
		left.ino === right.ino &&
		left.size === right.size &&
		left.mtimeNs === right.mtimeNs &&
		left.ctimeNs === right.ctimeNs
	);
};

/** A file's contents together with the identity they were read under */
export type FileSnapshot = {
	/** The bytes the file held */
	contents: Buffer;
	/**
	 * The file as it was just before the bytes were read, which is what
	 * {@link PreparedAtomicWrite.commitIfUnchanged} checks against
	 */
	identity: FileIdentity;
};

/**
 * Read a file together with its identity, for a write that must not land on top
 * of a change made after the read.
 *
 * The identity is taken from the open file just before its contents are read, so
 * anything written from then on, the part of a write still in progress included,
 * leaves the file looking different from it.
 *
 * @param filePath The file to read (absolute path)
 * @throws What opening or reading throws; ENOENT for a file that is not there
 */
export async function readFileSnapshot(
	filePath: string,
): Promise<FileSnapshot> {
	const handle = await open(filePath, "r");
	try {
		const identity = toFileIdentity(await handle.stat({ bigint: true }));
		const contents = await handle.readFile();
		return { contents, identity };
	} finally {
		await handle.close();
	}
}

/**
 * Looks at the file behind a path as it is now.
 *
 * @returns null for a path with no file behind it
 */
const statFileIdentity = async (
	filePath: string,
): Promise<FileIdentity | null> => {
	try {
		return toFileIdentity(await stat(filePath, { bigint: true }));
	} catch (error) {
		if (isErrnoWithCode(error, "ENOENT")) {
			return null;
		}
		throw error;
	}
};

/**
 * A replacement written out in full beside its destination, waiting for the one
 * rename that puts it in place. Settle it with exactly one of commit,
 * commitIfUnchanged or abort; abort after either of the others does nothing, so
 * it can sit in a `finally`.
 */
export type PreparedAtomicWrite = {
	/**
	 * Put the replacement in place, whatever the destination holds now.
	 *
	 * @throws The reason the rename failed; the temporary file is removed and the
	 *   destination left as it was
	 */
	commit: () => Promise<void>;
	/**
	 * Put the replacement in place only if the destination is still the file a
	 * snapshot saw.
	 *
	 * The check is a stat taken immediately before the rename. POSIX has no
	 * rename that only happens if the destination is unchanged, so a write
	 * landing between that stat and the rename is still replaced unseen; this
	 * narrows the gap to those two calls, it does not close it.
	 *
	 * @param expected The destination's identity as it was read
	 *   ({@link readFileSnapshot}), or null when it was found not to exist and
	 *   must still not
	 * @returns false, with the temporary file removed and the destination left as
	 *   it is, when the destination has changed since; true once the replacement
	 *   is in place
	 * @throws The reason the stat or the rename failed; the temporary file is
	 *   removed and the destination left as it was
	 */
	commitIfUnchanged: (expected: FileIdentity | null) => Promise<boolean>;
	/** Discard the replacement, leaving the destination as it was */
	abort: () => Promise<void>;
};

/**
 * Write a file's replacement out beside it, ready to be put in place with a
 * single rename.
 *
 * Everything that can take time happens here, so that whatever a caller checks
 * before committing is as close to the rename as it can be. The temporary file
 * is in the same directory (a rename is atomic only within one filesystem), is
 * named starting with a dot, and is removed when the write fails or is aborted.
 * It is left behind only when the process is killed, and that leftover cannot be
 * mistaken for the real thing (it does not end in `.jis`, so it is not picked up
 * as a canvas).
 *
 * When the destination already exists, its permissions are carried over, from
 * the moment the temporary file is created onward. Without that, the newly
 * created file keeps the default mode (from umask), which can be looser than the
 * original.
 *
 * A destination the process may not write to is refused, as writing it directly
 * would be. The rename only needs the directory to be writable, so without the
 * check a read-only file would be replaced all the same.
 *
 * @param filePath The destination to replace. Its parent directory must exist
 * @param contents The contents to write
 * @throws The reason the destination may not be written or the temporary file
 *   could not be; nothing is left behind and filePath is untouched
 */
export async function prepareAtomicWrite(
	filePath: string,
	contents: string | Uint8Array,
): Promise<PreparedAtomicWrite> {
	const tempPath = join(
		dirname(filePath),
		`.${basename(filePath)}.${randomUUID()}.tmp`,
	);
	// With no destination file this is a fresh creation, so the default mode stands
	const previousMode = await stat(filePath)
		.then((stats) => stats.mode)
		.catch(() => null);
	if (previousMode !== null) {
		await access(filePath, constants.W_OK);
	}
	try {
		// The mode is given at creation so the contents are never readable through a
		// wider mode than the destination had, and set again afterwards because umask
		// can take bits off the one asked for at creation
		await writeFile(
			tempPath,
			contents,
			previousMode === null ? undefined : { mode: previousMode },
		);
		if (previousMode !== null) {
			await chmod(tempPath, previousMode);
		}
	} catch (error) {
		await rm(tempPath, { force: true });
		throw error;
	}

	let isSettled = false;
	const discardTempFile = async (): Promise<void> => {
		isSettled = true;
		await rm(tempPath, { force: true });
	};
	const renameIntoPlace = async (): Promise<void> => {
		if (isSettled) {
			throw new Error("this prepared write has already been settled");
		}
		try {
			await rename(tempPath, filePath);
			isSettled = true;
		} catch (error) {
			await discardTempFile();
			throw error;
		}
	};
	return {
		commit: renameIntoPlace,
		commitIfUnchanged: async (expected) => {
			let current: FileIdentity | null;
			try {
				current = await statFileIdentity(filePath);
			} catch (error) {
				await discardTempFile();
				throw error;
			}
			if (!isSameFileIdentity(expected, current)) {
				await discardTempFile();
				return false;
			}
			await renameIntoPlace();
			return true;
		},
		abort: async () => {
			if (!isSettled) {
				await discardTempFile();
			}
		},
	};
}

/**
 * Replace a file without letting anyone see it half written.
 *
 * Writes to a temporary file in the same directory and then renames it. A rename
 * within one filesystem is atomic, so a reader only ever sees the file with
 * either the old contents or the new ones. Overwriting directly with `writeFile`
 * can be read at whatever length it has reached mid-write. The temporary file,
 * the permissions carried over and the refusal of a read-only destination are
 * as {@link prepareAtomicWrite} describes; a caller that must not overwrite a
 * change made after it read the file uses that with
 * {@link PreparedAtomicWrite.commitIfUnchanged} instead.
 *
 * What this guards is not what pathLock (src/pathLock.ts) guards. That one keeps
 * the tools' writes and the viewer's from cutting in on each other, and the host's
 * file watcher and outside editors do not go through it. This one holds for every
 * reader, by whichever route.
 *
 * When the destination is a symbolic link, the link itself is replaced by an
 * ordinary file (overwriting directly would rewrite what the link points at).
 * A caller that means to update what the link leads to resolves it first, as
 * toCanvasFilePath (src/canvasStore.ts) does for every tool.
 *
 * @param filePath The destination to replace. Its parent directory must exist
 * @param contents The contents to write
 * @throws The reason the write or the replacement failed; filePath is left as it was
 */
export async function writeFileAtomically(
	filePath: string,
	contents: string | Uint8Array,
): Promise<void> {
	const prepared = await prepareAtomicWrite(filePath, contents);
	await prepared.commit();
}
