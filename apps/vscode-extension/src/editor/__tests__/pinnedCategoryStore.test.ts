import { afterEach, describe, expect, it, vi } from "vitest";

import {
	createPinnedCategoryStore,
	PINNED_CATEGORY_IDS_STATE_KEY,
	type PinnedCategoryMemento,
} from "../pinnedCategoryStore";

/** An in-memory memento whose update can be made to fail. */
function createFakeMemento(
	initialEntries: Record<string, unknown> = {},
	updateError?: Error,
): PinnedCategoryMemento & { entries: Map<string, unknown> } {
	const entries = new Map(Object.entries(initialEntries));
	return {
		entries,
		get: (key) => entries.get(key),
		update: (key, value) => {
			if (updateError) {
				return Promise.reject(updateError);
			}
			entries.set(key, value);
			return Promise.resolve();
		},
	};
}

describe("createPinnedCategoryStore", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("reads null when nothing is stored", () => {
		const store = createPinnedCategoryStore(createFakeMemento());
		expect(store.readPinnedCategoryIds()).toBeNull();
	});

	it("reads back what it wrote, under the synced key", async () => {
		const memento = createFakeMemento();
		const store = createPinnedCategoryStore(memento);
		store.writePinnedCategoryIds(["uml", "not-installed-plugin"]);
		await Promise.resolve();
		expect(memento.entries.get(PINNED_CATEGORY_IDS_STATE_KEY)).toEqual([
			"uml",
			"not-installed-plugin",
		]);
		expect(store.readPinnedCategoryIds()).toEqual([
			"uml",
			"not-installed-plugin",
		]);
	});

	it("reads an empty list as the user's choice, not as nothing stored", () => {
		const store = createPinnedCategoryStore(
			createFakeMemento({ [PINNED_CATEGORY_IDS_STATE_KEY]: [] }),
		);
		expect(store.readPinnedCategoryIds()).toEqual([]);
	});

	it("reads a malformed stored value as null and warns about it", () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		for (const storedValue of ["flowchart", [1], ["uml", "uml"], null]) {
			const store = createPinnedCategoryStore(
				createFakeMemento({ [PINNED_CATEGORY_IDS_STATE_KEY]: storedValue }),
			);
			expect(store.readPinnedCategoryIds()).toBeNull();
		}
		expect(warn).toHaveBeenCalledTimes(4);
	});

	it("logs a failed write instead of throwing", async () => {
		const error = vi.spyOn(console, "error").mockImplementation(() => {});
		const store = createPinnedCategoryStore(
			createFakeMemento({}, new Error("disk full")),
		);
		expect(() => store.writePinnedCategoryIds(["uml"])).not.toThrow();
		await vi.waitFor(() => {
			expect(error).toHaveBeenCalledTimes(1);
		});
	});
});
