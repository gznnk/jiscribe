import { toCanvasFilePath } from "./canvasStore";
import type { PathLock } from "./pathLock";

/**
 * Resolve a tool's `path` argument and run a task under that file's lock, the
 * lock being taken in the order the calls arrived.
 *
 * @param path The path as the AI gave it; checked and resolved by
 *   toCanvasFilePath, whose CanvasFileError is what the returned promise
 *   rejects with when the path is refused
 * @param task The work on the file. It receives the resolved path, which is
 *   the lock key and the path to read, write and key the undo history by
 */
export type CanvasFileLock = <T>(
	path: string,
	task: (filePath: string) => Promise<T>,
) => Promise<T>;

/**
 * Create the gate every tool naming a canvas file goes through.
 *
 * Resolving a path through its links is asynchronous, and resolutions started
 * together finish in any order. Queuing on the lock as each one finished would
 * let a call overtake one sent before it on the same file (a delete sent before
 * an add running after it, and removing what the add made), so the calls are
 * admitted one at a time: each resolves its path only once the call ahead of it
 * has been queued on its lock. Only the resolution waits; the file work itself
 * still runs per path, so a slow file does not hold up another.
 *
 * @param withPathLock The per-path lock to queue on. A person's save from the
 *   viewer queues on the same one directly, its path being resolved already
 * @returns A function that runs a task under the lock of the file `path` names
 */
export function createCanvasFileLock(withPathLock: PathLock): CanvasFileLock {
	// Settles once the last call admitted is queued on its lock (or refused)
	let admissionTail: Promise<unknown> = Promise.resolve();

	return async <T>(
		path: string,
		task: (filePath: string) => Promise<T>,
	): Promise<T> => {
		// Wrapped in an object so the admission settles on queuing, not on the
		// task's completion
		const admitted = admissionTail.then(async () => {
			const filePath = await toCanvasFilePath(path);
			return { queued: withPathLock(filePath, () => task(filePath)) };
		});
		admissionTail = admitted.catch(() => undefined);
		const { queued } = await admitted;
		return await queued;
	};
}
