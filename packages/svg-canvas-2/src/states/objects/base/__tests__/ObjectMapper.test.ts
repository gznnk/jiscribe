import { describe, expect, it } from "vitest";

import type { MetaDoc } from "../../../../schemas/objects/base/MetaDoc";
import type { ObjectDoc } from "../../../../schemas/objects/base/ObjectDoc";
import type { MetaState } from "../../../../states/objects/base/MetaState";
import { ObjectMapper } from "../../../../states/objects/base/ObjectMapper";
import type { ObjectState } from "../../../../states/objects/base/ObjectState";

describe("ObjectMapper", () => {
	describe("toState", () => {
		it("should convert ObjectDoc with all properties to ObjectState", () => {
			const doc: ObjectDoc = {
				id: "object-1",
				type: "rect",
				meta: {
					name: "Test Rectangle",
					description: "A test rectangle object",
				} as unknown as MetaDoc,
			};

			const state = ObjectMapper.toState(doc);

			expect(state.id).toBe("object-1");
			expect(state.type).toBe("rect");
			expect(state.meta).toBeDefined();
			expect(state.meta?.name).toBe("Test Rectangle");
			expect(state.meta?.description).toBe("A test rectangle object");
		});

		it("should convert ObjectDoc without meta to ObjectState", () => {
			const doc: ObjectDoc = {
				id: "object-2",
				type: "ellipse",
			};

			const state = ObjectMapper.toState(doc);

			expect(state.id).toBe("object-2");
			expect(state.type).toBe("ellipse");
			expect(state.meta).toBeUndefined();
		});

		it("should convert ObjectDoc with undefined meta to ObjectState", () => {
			const doc: ObjectDoc = {
				id: "object-3",
				type: "polygon",
				meta: undefined,
			};

			const state = ObjectMapper.toState(doc);

			expect(state.id).toBe("object-3");
			expect(state.type).toBe("polygon");
			expect(state.meta).toBeUndefined();
		});

		it("should handle meta with only name", () => {
			const doc: ObjectDoc = {
				id: "object-4",
				type: "group",
				meta: {
					name: "My Group",
				} as unknown as MetaDoc,
			};

			const state = ObjectMapper.toState(doc);

			expect(state.id).toBe("object-4");
			expect(state.type).toBe("group");
			expect(state.meta?.name).toBe("My Group");
			expect(state.meta?.description).toBeUndefined();
		});

		it("should handle meta with custom properties", () => {
			const doc: ObjectDoc = {
				id: "object-5",
				type: "sticky",
				meta: {
					name: "Sticky Note",
					customProp: "custom value",
					tags: ["note", "important"],
				} as unknown as MetaDoc,
			};

			const state = ObjectMapper.toState(doc);

			expect(state.id).toBe("object-5");
			expect(state.meta?.name).toBe("Sticky Note");
			expect((state.meta as Record<string, unknown>)?.customProp).toBe("custom value");
			expect((state.meta as Record<string, unknown>)?.tags).toEqual(["note", "important"]);
		});

		it("should handle different object types", () => {
			const types = ["rect", "ellipse", "polygon", "polyline", "group", "sticky", "connector"] as const;

			types.forEach((type) => {
				const doc: ObjectDoc = {
					id: `${type}-1`,
					type,
				};

				const state = ObjectMapper.toState(doc);

				expect(state.id).toBe(`${type}-1`);
				expect(state.type).toBe(type);
			});
		});
	});

	describe("toDoc", () => {
		it("should convert ObjectState with all properties to ObjectDoc", () => {
			const state: ObjectState = {
				id: "object-1",
				type: "rect",
				meta: {
					name: "Test Rectangle",
					description: "A test rectangle object",
				} as unknown as MetaState,
			};

			const doc = ObjectMapper.toDoc(state);

			expect(doc.id).toBe("object-1");
			expect(doc.type).toBe("rect");
			expect(doc.meta).toBeDefined();
			expect(doc.meta?.name).toBe("Test Rectangle");
			expect(doc.meta?.description).toBe("A test rectangle object");
		});

		it("should convert ObjectState without meta to ObjectDoc", () => {
			const state: ObjectState = {
				id: "object-2",
				type: "ellipse",
			};

			const doc = ObjectMapper.toDoc(state);

			expect(doc.id).toBe("object-2");
			expect(doc.type).toBe("ellipse");
			expect(doc.meta).toBeUndefined();
		});

		it("should convert ObjectState with undefined meta to ObjectDoc", () => {
			const state: ObjectState = {
				id: "object-3",
				type: "polygon",
				meta: undefined,
			};

			const doc = ObjectMapper.toDoc(state);

			expect(doc.id).toBe("object-3");
			expect(doc.type).toBe("polygon");
			expect(doc.meta).toBeUndefined();
		});

		it("should handle meta with only description", () => {
			const state: ObjectState = {
				id: "object-4",
				type: "polyline",
				meta: {
					description: "A polyline description",
				} as unknown as MetaState,
			};

			const doc = ObjectMapper.toDoc(state);

			expect(doc.id).toBe("object-4");
			expect(doc.type).toBe("polyline");
			expect(doc.meta?.name).toBeUndefined();
			expect(doc.meta?.description).toBe("A polyline description");
		});

		it("should handle meta with custom properties", () => {
			const state: ObjectState = {
				id: "object-5",
				type: "connector",
				meta: {
					name: "Connection",
					customProp: "custom value",
					tags: ["connector", "active"],
				} as unknown as MetaState,
			};

			const doc = ObjectMapper.toDoc(state);

			expect(doc.id).toBe("object-5");
			expect(doc.meta?.name).toBe("Connection");
			expect((doc.meta as Record<string, unknown>)?.customProp).toBe("custom value");
			expect((doc.meta as Record<string, unknown>)?.tags).toEqual(["connector", "active"]);
		});

		it("should handle different object types", () => {
			const types = ["rect", "ellipse", "polygon", "polyline", "group", "sticky", "connector"] as const;

			types.forEach((type) => {
				const state: ObjectState = {
					id: `${type}-1`,
					type,
				};

				const doc = ObjectMapper.toDoc(state);

				expect(doc.id).toBe(`${type}-1`);
				expect(doc.type).toBe(type);
			});
		});
	});

	describe("bidirectional conversion", () => {
		it("should maintain data integrity through round-trip conversion (Doc -> State -> Doc)", () => {
			const originalDoc: ObjectDoc = {
				id: "round-trip-1",
				type: "rect",
				meta: {
					name: "Round Trip Test",
					description: "Testing bidirectional conversion",
					customField: "value",
				} as unknown as MetaDoc,
			};

			const state = ObjectMapper.toState(originalDoc);
			const convertedDoc = ObjectMapper.toDoc(state);

			expect(convertedDoc.id).toBe(originalDoc.id);
			expect(convertedDoc.type).toBe(originalDoc.type);
			expect(convertedDoc.meta).toEqual(originalDoc.meta);
		});

		it("should maintain data integrity through round-trip conversion (State -> Doc -> State)", () => {
			const originalState: ObjectState = {
				id: "round-trip-2",
				type: "ellipse",
				meta: {
					name: "Round Trip Test",
					description: "Testing bidirectional conversion",
					customField: "value",
				} as unknown as MetaState,
			};

			const doc = ObjectMapper.toDoc(originalState);
			const state = ObjectMapper.toState(doc);

			expect(state.id).toBe(originalState.id);
			expect(state.type).toBe(originalState.type);
			expect(state.meta).toEqual(originalState.meta);
		});

		it("should maintain data integrity without meta", () => {
			const originalDoc: ObjectDoc = {
				id: "round-trip-3",
				type: "polygon",
			};

			const state = ObjectMapper.toState(originalDoc);
			const convertedDoc = ObjectMapper.toDoc(state);

			expect(convertedDoc).toEqual(originalDoc);
		});

		it("should maintain data integrity with complex meta", () => {
			const originalDoc: ObjectDoc = {
				id: "round-trip-4",
				type: "group",
				meta: {
					name: "Complex Group",
					description: "A group with complex metadata",
					metadata: {
						created: "2024-01-01",
						modified: "2024-01-02",
						author: { name: "Test User", id: 123 },
					},
					tags: ["important", "test"],
					flags: { visible: true, locked: false },
				} as unknown as MetaDoc,
			};

			const state = ObjectMapper.toState(originalDoc);
			const convertedDoc = ObjectMapper.toDoc(state);

			expect(convertedDoc).toEqual(originalDoc);
		});

		it("should maintain data integrity for all object types", () => {
			const types = ["rect", "ellipse", "polygon", "polyline", "group", "sticky", "connector"] as const;

			types.forEach((type) => {
				const originalDoc: ObjectDoc = {
					id: `${type}-round-trip`,
					type,
					meta: {
						name: `${type} object`,
						description: `Testing ${type}`,
					} as unknown as MetaDoc,
				};

				const state = ObjectMapper.toState(originalDoc);
				const convertedDoc = ObjectMapper.toDoc(state);

				expect(convertedDoc).toEqual(originalDoc);
			});
		});
	});

	describe("edge cases", () => {
		it("should handle empty meta object", () => {
			const doc: ObjectDoc = {
				id: "edge-1",
				type: "rect",
				meta: {} as unknown as MetaDoc,
			};

			const state = ObjectMapper.toState(doc);
			const convertedDoc = ObjectMapper.toDoc(state);

			expect(state.meta).toBeDefined();
			expect(convertedDoc.meta).toBeDefined();
			expect(state.meta?.name).toBeUndefined();
			expect(state.meta?.description).toBeUndefined();
		});

		it("should handle meta with null values", () => {
			const doc: ObjectDoc = {
				id: "edge-2",
				type: "ellipse",
				meta: {
					name: "Object",
					nullValue: null,
				} as unknown as MetaDoc,
			};

			const state = ObjectMapper.toState(doc);

			expect((state.meta as Record<string, unknown>)?.nullValue).toBeNull();
		});

		it("should handle meta with nested objects", () => {
			const doc: ObjectDoc = {
				id: "edge-3",
				type: "polygon",
				meta: {
					nested: {
						deep: {
							value: "deeply nested",
						},
					},
				} as unknown as MetaDoc,
			};

			const state = ObjectMapper.toState(doc);
			const convertedDoc = ObjectMapper.toDoc(state);

			expect((convertedDoc.meta as Record<string, unknown>)?.nested).toEqual({
				deep: {
					value: "deeply nested",
				},
			});
		});

		it("should handle meta with arrays", () => {
			const doc: ObjectDoc = {
				id: "edge-4",
				type: "group",
				meta: {
					items: [1, 2, 3],
					nested: [{ a: 1 }, { b: 2 }],
				} as unknown as MetaDoc,
			};

			const state = ObjectMapper.toState(doc);
			const convertedDoc = ObjectMapper.toDoc(state);

			expect((convertedDoc.meta as Record<string, unknown>)?.items).toEqual([1, 2, 3]);
			expect((convertedDoc.meta as Record<string, unknown>)?.nested).toEqual([{ a: 1 }, { b: 2 }]);
		});
	});
});
