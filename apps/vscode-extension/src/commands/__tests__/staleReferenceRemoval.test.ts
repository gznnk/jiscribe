import { describe, expect, it, vi } from "vitest";

import { GENERATED_NOTICE } from "../generatedFileNotice";
import {
	removeGeneratedReference,
	type StaleFileAccess,
} from "../staleReferenceRemoval";

const GENERATED_REFERENCE = new TextEncoder().encode(
	`${GENERATED_NOTICE}\n\n# Jiscribe reference\n`,
);
const USER_REFERENCE = new TextEncoder().encode(
	"# Team notes\n\nOur shape conventions.\n",
);

/** File access over fixed bytes, with a delete that can be made to fail. */
const makeFile = (
	bytes: Uint8Array | null,
	deleteFails: (useTrash: boolean) => boolean = () => false,
): StaleFileAccess & { deletes: boolean[] } => {
	const deletes: boolean[] = [];
	return {
		deletes,
		read: async () => {
			if (bytes === null) {
				throw new Error("EntryNotFound");
			}
			return bytes;
		},
		delete: async (useTrash) => {
			deletes.push(useTrash);
			if (deleteFails(useTrash)) {
				throw new Error("Unsupported");
			}
		},
	};
};

describe("removeGeneratedReference", () => {
	it("reports the normal case, where no reference.md is there", async () => {
		const file = makeFile(null);

		expect(await removeGeneratedReference(file)).toBe("absent");
		expect(file.deletes).toEqual([]);
	});

	it("removes a copy we generated, to the trash", async () => {
		const file = makeFile(GENERATED_REFERENCE);

		expect(await removeGeneratedReference(file)).toBe("removed");
		expect(file.deletes).toEqual([true]);
	});

	it("removes it permanently where the filesystem has no trash", async () => {
		const file = makeFile(GENERATED_REFERENCE, (useTrash) => useTrash);

		expect(await removeGeneratedReference(file)).toBe("removed");
		expect(file.deletes).toEqual([true, false]);
	});

	it("leaves a file we did not write alone, without deleting anything", async () => {
		const file = makeFile(USER_REFERENCE);
		const del = vi.spyOn(file, "delete");

		expect(await removeGeneratedReference(file)).toBe("kept");
		expect(del).not.toHaveBeenCalled();
	});

	it("reports a copy of ours it could not delete instead of rejecting", async () => {
		const file = makeFile(GENERATED_REFERENCE, () => true);

		expect(await removeGeneratedReference(file)).toBe("failed");
		expect(file.deletes).toEqual([true, false]);
	});
});
