import { resolve } from "node:path";

/** win32 does not distinguish case in paths, so the key follows the same rule */
const toLockKey = (filePath: string): string => {
	const resolvedPath = resolve(filePath);
	return process.platform === "win32"
		? resolvedPath.toLowerCase()
		: resolvedPath;
};

/**
 * A gate that runs one file's task only once the tasks queued ahead of it for
 * that file have finished.
 *
 * @param filePath The target file (it need not be absolute; it is resolved before being used as the key)
 * @param task The task to run. It runs even when a task ahead of it failed
 */
export type PathLock = <T>(
	filePath: string,
	task: () => Promise<T>,
) => Promise<T>;

/**
 * Create a gate that lets operations on the same file through one at a time.
 *
 * Every tool updates a file by "load → modify → write back", so another operation
 * cutting in during that makes the later write-back discard the earlier change
 * along with it. The AI throws independent additions in as one batch, which makes
 * this the default route rather than a rare race.
 *
 * Serialization is per path, so operations on different files do not wait for
 * each other.
 *
 * @returns A function that runs task serialized per path
 */
export function createPathLock(): PathLock {
	// The last operation queued, per path. Deleted once it settles, so this does
	// not grow with every file touched
	const tailByKey = new Map<string, Promise<void>>();

	return async <T>(filePath: string, task: () => Promise<T>): Promise<T> => {
		const key = toLockKey(filePath);
		const previous = tailByKey.get(key) ?? Promise.resolve();
		// Whether the one ahead succeeded does not matter; it is awaited only to keep
		// the chain unbroken
		const started = previous.then(task, task);
		const settled = started.then(
			() => undefined,
			() => undefined,
		);
		tailByKey.set(key, settled);
		try {
			return await started;
		} finally {
			// Still the tail, so this key is no longer needed
			if (tailByKey.get(key) === settled) {
				tailByKey.delete(key);
			}
		}
	};
}
