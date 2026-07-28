import { describe, it, expect } from "vitest";

import type { RecordDoc } from "../../schema/RecordDoc";
import { RECORD_DOC_DEFAULTS } from "../../schema/RecordDoc";
import { recordToState } from "../RecordMapper";
import { isValidRecordState } from "../validateRecordState";

const baseState = {
	...recordToState({ ...RECORD_DOC_DEFAULTS, id: "r-1" } as RecordDoc),
	text: { name: { text: "User" }, attributes: { text: ["id: string"] } },
};

describe("isValidRecordState", () => {
	it("accepts a record with a title and a compartment", () => {
		expect(isValidRecordState(baseState)).toBe(true);
	});

	it("accepts all three compartments", () => {
		expect(
			isValidRecordState({
				...baseState,
				text: {
					name: { text: "User" },
					attributes: { text: ["id"] },
					operations: { text: ["save()"] },
				},
			}),
		).toBe(true);
	});

	it("accepts a title-only record", () => {
		// 区画の欠落は「その区画を持たない箱」であって壊れた state ではない。
		expect(
			isValidRecordState({ ...baseState, text: { name: { text: "User" } } }),
		).toBe(true);
	});

	it("accepts empty slot contents", () => {
		expect(
			isValidRecordState({
				...baseState,
				text: { name: { text: "" }, attributes: { text: [] } },
			}),
		).toBe(true);
	});

	it("rejects a record with no title", () => {
		expect(
			isValidRecordState({ ...baseState, text: { attributes: { text: [] } } }),
		).toBe(false);
		expect(isValidRecordState({ ...baseState, text: undefined })).toBe(false);
	});

	it("rejects a slot the record does not have", () => {
		expect(
			isValidRecordState({
				...baseState,
				text: { name: { text: "User" }, rows: { text: [] } },
			}),
		).toBe(false);
	});

	it("rejects a bare content and mistyped slot contents", () => {
		expect(isValidRecordState({ ...baseState, text: "User" })).toBe(false);
		expect(
			isValidRecordState({
				...baseState,
				text: { name: "User", attributes: ["id"] },
			}),
		).toBe(false);
		expect(
			isValidRecordState({
				...baseState,
				text: { name: { text: 1 }, attributes: { text: [] } },
			}),
		).toBe(false);
		expect(
			isValidRecordState({
				...baseState,
				text: { name: { text: "U" }, attributes: { text: [1] } },
			}),
		).toBe(false);
		expect(
			isValidRecordState({
				...baseState,
				text: { name: { text: "U" }, operations: { text: "save()" } },
			}),
		).toBe(false);
	});

	it("rejects a state whose type is not record", () => {
		expect(isValidRecordState({ ...baseState, type: "rect" })).toBe(false);
	});
});
