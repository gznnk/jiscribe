/**
 * The rail's pinned categories, kept in the viewer's `localStorage` between
 * page loads. A per-person UI preference, never part of the document; what may
 * go in that storage at all is in CLAUDE.md ("Host and viewer").
 */

import { isDistinctStringArray } from "@jiscribe/basic-validators";
import { standardDefaultPinnedCategoryIds } from "@jiscribe/standard-shapes";

/** The localStorage key the pins are stored under. */
export const PINNED_CATEGORY_IDS_STORAGE_KEY =
	"jiscribe-mcp.viewer.pinnedCategoryIds";

/** The half of `Storage` the pins use. */
export type PinnedCategoryStorage = Pick<Storage, "getItem" | "setItem">;

/**
 * Reaches the storage. A getter rather than the storage itself, because merely
 * reading `window.localStorage` throws where site data is blocked.
 */
export type GetPinnedCategoryStorage = () => PinnedCategoryStorage;

const getWindowLocalStorage: GetPinnedCategoryStorage = () =>
	window.localStorage;

/**
 * The pins the canvas mounts with: the stored ones, else the shape set's
 * default pins.
 *
 * @param getStorage Reaches the storage; defaults to `window.localStorage`
 * @returns `standardDefaultPinnedCategoryIds` when nothing is stored, and when
 *   the storage cannot be read or holds anything but a JSON array of distinct
 *   strings (see the canvas's createInitialControllerState); both are logged
 *   as a warning. Ids the shape set does not hold are kept, and an empty
 *   stored array is returned as is, as the person unpinned everything
 */
export const readStoredPinnedCategoryIds = (
	getStorage: GetPinnedCategoryStorage = getWindowLocalStorage,
): readonly string[] => {
	let storedText: string | null;
	try {
		storedText = getStorage().getItem(PINNED_CATEGORY_IDS_STORAGE_KEY);
	} catch (error) {
		console.warn("[jiscribe] Could not read the stored pins:", error);
		return standardDefaultPinnedCategoryIds;
	}
	if (storedText === null) {
		return standardDefaultPinnedCategoryIds;
	}
	let storedValue: unknown;
	try {
		storedValue = JSON.parse(storedText);
	} catch {
		storedValue = undefined;
	}
	if (!isDistinctStringArray(storedValue)) {
		console.warn("[jiscribe] Ignoring malformed stored pins:", storedText);
		return standardDefaultPinnedCategoryIds;
	}
	return storedValue;
};

/**
 * Stores the pins the next page load starts from.
 *
 * @param pinnedCategoryIds The pins `onPinnedCategoriesChange` reported, in
 *   rail order
 * @param getStorage Reaches the storage; defaults to `window.localStorage`. A
 *   storage that cannot be written (blocked, full) is logged as a warning, not
 *   thrown: the pins stay as they are on screen and only the preference is lost
 */
export const storePinnedCategoryIds = (
	pinnedCategoryIds: readonly string[],
	getStorage: GetPinnedCategoryStorage = getWindowLocalStorage,
): void => {
	try {
		getStorage().setItem(
			PINNED_CATEGORY_IDS_STORAGE_KEY,
			JSON.stringify(pinnedCategoryIds),
		);
	} catch (error) {
		console.warn("[jiscribe] Could not store the pins:", error);
	}
};
