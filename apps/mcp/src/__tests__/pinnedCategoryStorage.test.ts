import { standardDefaultPinnedCategoryIds } from "@jiscribe/standard-shapes";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
	PINNED_CATEGORY_IDS_STORAGE_KEY,
	readStoredPinnedCategoryIds,
	storePinnedCategoryIds,
	type PinnedCategoryStorage,
} from "../viewer/pinnedCategoryStorage";

/** An in-memory storage */
const createFakeStorage = (
	initialEntries: Record<string, string> = {},
): PinnedCategoryStorage & { entries: Map<string, string> } => {
	const entries = new Map(Object.entries(initialEntries));
	return {
		entries,
		getItem: (key) => entries.get(key) ?? null,
		setItem: (key, value) => {
			entries.set(key, value);
		},
	};
};

const throwingStorage = (): PinnedCategoryStorage => {
	throw new DOMException("blocked", "SecurityError");
};

describe("the viewer's stored pins", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("start from the shape set's default pins when nothing is stored", () => {
		const storage = createFakeStorage();
		expect(readStoredPinnedCategoryIds(() => storage)).toEqual(
			standardDefaultPinnedCategoryIds,
		);
	});

	it("read back what was stored, ids the shape set does not hold included", () => {
		const storage = createFakeStorage();
		storePinnedCategoryIds(["uml", "not-installed-plugin"], () => storage);
		expect(storage.entries.get(PINNED_CATEGORY_IDS_STORAGE_KEY)).toBe(
			'["uml","not-installed-plugin"]',
		);
		expect(readStoredPinnedCategoryIds(() => storage)).toEqual([
			"uml",
			"not-installed-plugin",
		]);
	});

	it("read an empty list as the person's choice, not as nothing stored", () => {
		const storage = createFakeStorage({
			[PINNED_CATEGORY_IDS_STORAGE_KEY]: "[]",
		});
		expect(readStoredPinnedCategoryIds(() => storage)).toEqual([]);
	});

	it("fall back to the default pins on a malformed value, and warn", () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		const malformedTexts = [
			"not json",
			'"uml"',
			"[1]",
			'["uml","uml"]',
			"null",
		];
		for (const storedText of malformedTexts) {
			const storage = createFakeStorage({
				[PINNED_CATEGORY_IDS_STORAGE_KEY]: storedText,
			});
			expect(readStoredPinnedCategoryIds(() => storage)).toEqual(
				standardDefaultPinnedCategoryIds,
			);
		}
		expect(warn).toHaveBeenCalledTimes(malformedTexts.length);
	});

	it("fall back to the default pins when the storage cannot be reached, and warn", () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		expect(readStoredPinnedCategoryIds(throwingStorage)).toEqual(
			standardDefaultPinnedCategoryIds,
		);
		expect(warn).toHaveBeenCalledTimes(1);
	});

	it("warn instead of throwing when the storage cannot be written", () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		expect(() =>
			storePinnedCategoryIds(["uml"], throwingStorage),
		).not.toThrow();
		const fullStorage: PinnedCategoryStorage = {
			getItem: () => null,
			setItem: () => {
				throw new DOMException("full", "QuotaExceededError");
			},
		};
		expect(() =>
			storePinnedCategoryIds(["uml"], () => fullStorage),
		).not.toThrow();
		expect(warn).toHaveBeenCalledTimes(2);
	});
});
