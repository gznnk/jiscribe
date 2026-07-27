import { describe, it, expect } from "vitest";

import type { RecordDoc } from "../../schema/RecordDoc";
import { RECORD_DOC_DEFAULTS } from "../../schema/RecordDoc";
import { recordToState } from "../RecordMapper";
import { isValidRecordState } from "../validateRecordState";

const baseState = {
	...recordToState({ ...RECORD_DOC_DEFAULTS, id: "r-1" } as RecordDoc),
	text: { name: { text: "User" }, rows: { text: ["id: string"] } },
};

describe("isValidRecordState", () => {
	it("accepts a record with both slots", () => {
		expect(isValidRecordState(baseState)).toBe(true);
	});

	it("accepts empty slot contents", () => {
		expect(
			isValidRecordState({
				...baseState,
				text: { name: { text: "" }, rows: { text: [] } },
			}),
		).toBe(true);
	});

	it("rejects a missing slot", () => {
		expect(
			isValidRecordState({ ...baseState, text: { name: { text: "User" } } }),
		).toBe(false);
		expect(
			isValidRecordState({ ...baseState, text: { rows: { text: [] } } }),
		).toBe(false);
		expect(isValidRecordState({ ...baseState, text: undefined })).toBe(false);
	});

	it("rejects a bare content and mistyped slot contents", () => {
		expect(isValidRecordState({ ...baseState, text: "User" })).toBe(false);
		expect(
			isValidRecordState({
				...baseState,
				text: { name: "User", rows: ["id"] },
			}),
		).toBe(false);
		expect(
			isValidRecordState({
				...baseState,
				text: { name: { text: 1 }, rows: { text: [] } },
			}),
		).toBe(false);
		expect(
			isValidRecordState({
				...baseState,
				text: { name: { text: "U" }, rows: { text: [1] } },
			}),
		).toBe(false);
	});

	it("rejects a state whose type is not record", () => {
		expect(isValidRecordState({ ...baseState, type: "rect" })).toBe(false);
	});
});
