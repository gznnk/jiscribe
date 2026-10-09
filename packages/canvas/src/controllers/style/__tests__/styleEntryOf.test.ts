import { describe, it, expect } from "vitest";

import { applyStyleIntent } from "../applyStyleIntent";
import { readSelectionStyle } from "../readSelectionStyle";
import { rectOf, registriesOf, stateOf } from "./support/styleFixtures";

const registries = registriesOf();

describe("styleEntryOf", () => {
	it("a kind naming a prototype member is a kind no table holds", () => {
		const a = rectOf("a");
		const state = stateOf(["a"], { a });
		expect(
			applyStyleIntent(state, { kind: "toString", value: "#f00" }, registries),
		).toBe(state);
		expect(readSelectionStyle(state, "toString", registries)).toEqual({
			kind: "none",
		});
	});
});
