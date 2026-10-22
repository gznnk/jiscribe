import { describe, expect, it } from "vitest";

import {
	ER_ENTITY_MIN_SLOT_WIDTH,
	ER_ENTITY_MIN_TYPE_WIDTH,
	ER_ENTITY_MIN_WIDTH,
} from "../../schema/ErEntityDoc";
import type { ErEntityDoc } from "../../schema/ErEntityDoc";
import { erEntityToState } from "../ErEntityMapper";
import { isValidErEntityState } from "../validateErEntityState";

const baseState = erEntityToState({
	id: "users",
	type: "erEntity",
	x: 100,
	y: 80,
	nameWidth: 91,
	typeWidth: 100,
	name: "users",
	columns: [{ key: "PK", name: "id", type: "bigint" }, { name: "email" }],
} as ErEntityDoc);

describe("isValidErEntityState", () => {
	it("accepts what the mapper produces", () => {
		expect(isValidErEntityState(baseState)).toBe(true);
	});

	it("accepts an entity with no column, the title its only slot", () => {
		const { text, ...rest } = baseState;
		expect(isValidErEntityState({ ...rest, text: { name: text.name } })).toBe(
			true,
		);
	});

	describe("the widths", () => {
		it("rejects a box narrower than the minimum, stated or derived", () => {
			expect(
				isValidErEntityState({ ...baseState, width: ER_ENTITY_MIN_WIDTH - 1 }),
			).toBe(false);
			expect(
				isValidErEntityState({
					...baseState,
					derivedWidth: ER_ENTITY_MIN_WIDTH - 1,
				}),
			).toBe(false);
		});

		it("rejects a derived width that is missing", () => {
			const { derivedWidth: _dropped, ...rest } = baseState;
			expect(isValidErEntityState(rest)).toBe(false);
		});

		it("lets the key gutter go unstated, but not the name or the type", () => {
			const {
				keyWidth: _keyWidth,
				nameWidth: _nameWidth,
				...withoutKeyAndName
			} = baseState;
			expect(
				isValidErEntityState({
					...withoutKeyAndName,
					nameWidth: baseState.nameWidth,
				}),
			).toBe(true);
			expect(isValidErEntityState(withoutKeyAndName)).toBe(false);

			const { typeWidth: _typeWidth, ...withoutType } = baseState;
			expect(isValidErEntityState(withoutType)).toBe(false);
		});

		it("holds each slot width to its own minimum, the type's being the wider", () => {
			expect(
				isValidErEntityState({
					...baseState,
					keyWidth: ER_ENTITY_MIN_SLOT_WIDTH - 1,
				}),
			).toBe(false);
			expect(
				isValidErEntityState({
					...baseState,
					nameWidth: ER_ENTITY_MIN_SLOT_WIDTH - 1,
				}),
			).toBe(false);
			// A type width the name would take is still too narrow for the type.
			expect(
				isValidErEntityState({
					...baseState,
					typeWidth: ER_ENTITY_MIN_TYPE_WIDTH - 1,
				}),
			).toBe(false);
			expect(
				isValidErEntityState({
					...baseState,
					keyWidth: ER_ENTITY_MIN_SLOT_WIDTH,
					nameWidth: ER_ENTITY_MIN_SLOT_WIDTH,
					typeWidth: ER_ENTITY_MIN_TYPE_WIDTH,
				}),
			).toBe(true);
		});

		it("rejects a slot width that is not a number", () => {
			expect(isValidErEntityState({ ...baseState, keyWidth: "40" })).toBe(
				false,
			);
		});
	});

	describe("the slot set", () => {
		it("rejects text that is not a keyed map", () => {
			expect(isValidErEntityState({ ...baseState, text: "users" })).toBe(false);
		});

		it("rejects a column missing one of its three slots", () => {
			const { "col:1:type": _dropped, ...text } = baseState.text;
			expect(isValidErEntityState({ ...baseState, text })).toBe(false);
		});

		it("rejects a stray key past the columns", () => {
			expect(
				isValidErEntityState({
					...baseState,
					text: { ...baseState.text, note: { text: "x" } },
				}),
			).toBe(false);
		});

		it("rejects the right keys in another order, which is the order Tab walks", () => {
			const { name, ...columnSlots } = baseState.text;
			expect(
				isValidErEntityState({ ...baseState, text: { ...columnSlots, name } }),
			).toBe(false);
		});

		it("rejects a slot holding rows, which the doc cannot write", () => {
			expect(
				isValidErEntityState({
					...baseState,
					text: { ...baseState.text, "col:0:name": { text: ["id", "uuid"] } },
				}),
			).toBe(false);
		});

		it("accepts a slot styled per range, which is one body of text", () => {
			expect(
				isValidErEntityState({
					...baseState,
					text: {
						...baseState.text,
						"col:0:name": { text: [{ text: "id", fontWeight: "bold" }] },
					},
				}),
			).toBe(true);
		});
	});
});
