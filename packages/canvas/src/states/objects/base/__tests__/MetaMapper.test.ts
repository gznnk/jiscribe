import type { MetaDoc } from "@jiscribe/doc/model/objects/base/MetaDoc";
import { describe, expect, it } from "vitest";

import { MetaMapper } from "../../../../states/objects/base/MetaMapper";
import type { MetaState } from "../../../../states/objects/base/MetaState";

describe("MetaMapper", () => {
	describe("toState", () => {
		it("should convert MetaDoc with all properties to MetaState", () => {
			const doc: MetaDoc = {
				name: "Test Object",
				description: "This is a test object",
				customField: "custom value",
				tags: ["tag1", "tag2"],
			} as unknown as MetaDoc;

			const state = MetaMapper.toState(doc);

			expect(state.name).toBe("Test Object");
			expect(state.description).toBe("This is a test object");
			expect((state as Record<string, unknown>).customField).toBe(
				"custom value",
			);
			expect((state as Record<string, unknown>).tags).toEqual(["tag1", "tag2"]);
		});

		it("should convert MetaDoc with only name to MetaState", () => {
			const doc: MetaDoc = {
				name: "Named Object",
			} as unknown as MetaDoc;

			const state = MetaMapper.toState(doc);

			expect(state.name).toBe("Named Object");
			expect(state.description).toBeUndefined();
		});

		it("should convert MetaDoc with only description to MetaState", () => {
			const doc: MetaDoc = {
				description: "Object with description only",
			} as unknown as MetaDoc;

			const state = MetaMapper.toState(doc);

			expect(state.name).toBeUndefined();
			expect(state.description).toBe("Object with description only");
		});

		it("should convert empty MetaDoc to MetaState", () => {
			const doc: MetaDoc = {} as unknown as MetaDoc;

			const state = MetaMapper.toState(doc);

			expect(state.name).toBeUndefined();
			expect(state.description).toBeUndefined();
		});

		it("should preserve arbitrary properties", () => {
			const doc: MetaDoc = {
				name: "Test",
				customNumber: 42,
				customBoolean: true,
				customNull: null,
				customObject: { nested: "value" },
				customArray: [1, 2, 3],
			} as unknown as MetaDoc;

			const state = MetaMapper.toState(doc);

			expect((state as Record<string, unknown>).customNumber).toBe(42);
			expect((state as Record<string, unknown>).customBoolean).toBe(true);
			expect((state as Record<string, unknown>).customNull).toBeNull();
			expect((state as Record<string, unknown>).customObject).toEqual({
				nested: "value",
			});
			expect((state as Record<string, unknown>).customArray).toEqual([1, 2, 3]);
		});
	});

	describe("toDoc", () => {
		it("should convert MetaState with all properties to MetaDoc", () => {
			const state: MetaState = {
				name: "Test Object",
				description: "This is a test object",
				customField: "custom value",
				tags: ["tag1", "tag2"],
			} as unknown as MetaState;

			const doc = MetaMapper.toDoc(state);

			expect(doc.name).toBe("Test Object");
			expect(doc.description).toBe("This is a test object");
			expect((doc as Record<string, unknown>).customField).toBe("custom value");
			expect((doc as Record<string, unknown>).tags).toEqual(["tag1", "tag2"]);
		});

		it("should convert MetaState with only name to MetaDoc", () => {
			const state: MetaState = {
				name: "Named Object",
			} as unknown as MetaState;

			const doc = MetaMapper.toDoc(state);

			expect(doc.name).toBe("Named Object");
			expect(doc.description).toBeUndefined();
		});

		it("should convert MetaState with only description to MetaDoc", () => {
			const state: MetaState = {
				description: "Object with description only",
			} as unknown as MetaState;

			const doc = MetaMapper.toDoc(state);

			expect(doc.name).toBeUndefined();
			expect(doc.description).toBe("Object with description only");
		});

		it("should convert empty MetaState to MetaDoc", () => {
			const state: MetaState = {} as unknown as MetaState;

			const doc = MetaMapper.toDoc(state);

			expect(doc.name).toBeUndefined();
			expect(doc.description).toBeUndefined();
		});

		it("should preserve arbitrary properties", () => {
			const state: MetaState = {
				name: "Test",
				customNumber: 42,
				customBoolean: true,
				customNull: null,
				customObject: { nested: "value" },
				customArray: [1, 2, 3],
			} as unknown as MetaState;

			const doc = MetaMapper.toDoc(state);

			expect((doc as Record<string, unknown>).customNumber).toBe(42);
			expect((doc as Record<string, unknown>).customBoolean).toBe(true);
			expect((doc as Record<string, unknown>).customNull).toBeNull();
			expect((doc as Record<string, unknown>).customObject).toEqual({
				nested: "value",
			});
			expect((doc as Record<string, unknown>).customArray).toEqual([1, 2, 3]);
		});
	});

	describe("bidirectional conversion", () => {
		it("should maintain data integrity through round-trip conversion (Doc -> State -> Doc)", () => {
			const originalDoc: MetaDoc = {
				name: "Round Trip Test",
				description: "Testing bidirectional conversion",
				customField: "value",
				nested: { a: 1, b: 2 },
			} as unknown as MetaDoc;

			const state = MetaMapper.toState(originalDoc);
			const convertedDoc = MetaMapper.toDoc(state);

			expect(convertedDoc).toEqual(originalDoc);
		});

		it("should maintain data integrity through round-trip conversion (State -> Doc -> State)", () => {
			const originalState: MetaState = {
				name: "Round Trip Test",
				description: "Testing bidirectional conversion",
				customField: "value",
				nested: { a: 1, b: 2 },
			} as unknown as MetaState;

			const doc = MetaMapper.toDoc(originalState);
			const convertedState = MetaMapper.toState(doc);

			expect(convertedState).toEqual(originalState);
		});

		it("should maintain data integrity with empty object", () => {
			const originalDoc: MetaDoc = {} as unknown as MetaDoc;

			const state = MetaMapper.toState(originalDoc);
			const convertedDoc = MetaMapper.toDoc(state);

			expect(convertedDoc).toEqual(originalDoc);
		});

		it("should maintain data integrity with complex nested structures", () => {
			const originalDoc: MetaDoc = {
				name: "Complex Object",
				description: "Has nested structures",
				metadata: {
					created: "2024-01-01",
					modified: "2024-01-02",
					author: { name: "Test User", id: 123 },
				},
				tags: ["important", "test"],
				flags: { visible: true, locked: false },
			} as unknown as MetaDoc;

			const state = MetaMapper.toState(originalDoc);
			const convertedDoc = MetaMapper.toDoc(state);

			expect(convertedDoc).toEqual(originalDoc);
		});
	});
});
