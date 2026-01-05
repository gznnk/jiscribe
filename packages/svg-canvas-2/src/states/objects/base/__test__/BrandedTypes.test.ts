/**
 * Tests for Branded Types implementation.
 * This verifies that MetaDoc and MetaState cannot be directly assigned to each other.
 */

import { describe, it, expect } from "vitest";

import type { MetaDoc } from "../../../../schemas/objects/base/MetaDoc";
import type { MetaState } from "../MetaState";
import { MetaStateMapper } from "../MetaStateMapper";

describe("Branded Types", () => {
	it("should create MetaDoc instances", () => {
		const doc: MetaDoc = {
			name: "test",
			description: "desc",
		} as MetaDoc;

		expect(doc.name).toBe("test");
		expect(doc.description).toBe("desc");
	});

	it("should create MetaState instances", () => {
		const state: MetaState = {
			name: "test",
			description: "desc",
		} as MetaState;

		expect(state.name).toBe("test");
		expect(state.description).toBe("desc");
	});

	it("should convert MetaDoc to MetaState using mapper", () => {
		const doc: MetaDoc = {
			name: "test",
			description: "desc",
		} as MetaDoc;

		const state = MetaStateMapper.toState(doc);

		expect(state.name).toBe("test");
		expect(state.description).toBe("desc");
	});

	it("should convert MetaState to MetaDoc using mapper", () => {
		const state: MetaState = {
			name: "test",
			description: "desc",
		} as MetaState;

		const doc = MetaStateMapper.toDoc(state);

		expect(doc.name).toBe("test");
		expect(doc.description).toBe("desc");
	});

	it("should preserve custom properties through conversion", () => {
		const doc = {
			name: "test",
			description: "desc",
			customProp: "value",
		} as unknown as MetaDoc;

		const state = MetaStateMapper.toState(doc);
		const backToDoc = MetaStateMapper.toDoc(state);

		expect(backToDoc.customProp).toBe("value");
	});
});
