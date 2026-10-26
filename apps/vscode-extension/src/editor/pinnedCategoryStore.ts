/**
 * The rail's pinned categories as the extension keeps them between mounts,
 * extracted from the editor providers so it needs no VSCode API.
 *
 * The pins are a per-user UI preference, never part of the document: they live
 * in `context.globalState` under {@link PINNED_CATEGORY_IDS_STATE_KEY}, which
 * the store registers with `setKeysForSync` when created, so every editor of every workspace
 * starts from the same pins and Settings Sync carries them. Each Webview reads
 * them on its "ready", so a change made in one editor is what the next editor
 * mounted starts with; editors already showing a canvas keep their own pins.
 */

import { isDistinctStringArray } from "@jiscribe/basic-validators";

/** The globalState key the pins are stored under. */
export const PINNED_CATEGORY_IDS_STATE_KEY = "jiscribe.pinnedCategoryIds";

/** The part of `context.globalState` the store uses. */
export interface PinnedCategoryMemento {
	get(key: string): unknown;
	update(key: string, value: unknown): PromiseLike<void>;
	setKeysForSync(keys: readonly string[]): void;
}

/** Reads and writes the stored pins over one memento. */
export interface PinnedCategoryStore {
	/**
	 * The stored pins, in rail order.
	 *
	 * @returns null when nothing is stored, and when what is stored is not an
	 *   array of distinct strings (logged as a warning, and left in place until
	 *   the next write replaces it)
	 */
	readPinnedCategoryIds(): string[] | null;
	/**
	 * Store `pinnedCategoryIds` as the pins the next mount starts from.
	 *
	 * @param pinnedCategoryIds - already validated by the message guard; a
	 *   failed write is logged as an error, not thrown, since the Webview that
	 *   reported it has nothing to wait on
	 */
	writePinnedCategoryIds(pinnedCategoryIds: string[]): void;
}

/**
 * Bind the pin store to a memento, and register the pins' key for Settings Sync.
 *
 * @param memento - `context.globalState` in the extension; a fake in tests. Its
 *   `setKeysForSync` replaces the synced key list, so this store has to be the
 *   only caller
 */
export function createPinnedCategoryStore(
	memento: PinnedCategoryMemento,
): PinnedCategoryStore {
	memento.setKeysForSync([PINNED_CATEGORY_IDS_STATE_KEY]);
	return {
		readPinnedCategoryIds: () => {
			const storedValue = memento.get(PINNED_CATEGORY_IDS_STATE_KEY);
			if (storedValue === undefined) {
				return null;
			}
			if (!isDistinctStringArray(storedValue)) {
				console.warn(
					"[Jiscribe] Ignoring malformed pinned categories in globalState:",
					storedValue,
				);
				return null;
			}
			return storedValue;
		},
		writePinnedCategoryIds: (pinnedCategoryIds) => {
			memento
				.update(PINNED_CATEGORY_IDS_STATE_KEY, pinnedCategoryIds)
				.then(undefined, (error: unknown) => {
					console.error("[Jiscribe] Failed to store pinned categories:", error);
				});
		},
	};
}
