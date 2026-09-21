import { describe, expect, it } from "vitest";

import { RectFeatures } from "../../model/objects/primitives/rect/RectDoc";
import { createObjectDocValidatorRegistry } from "../ObjectDocValidatorRegistry";

describe("ObjectDocValidatorRegistry", () => {
	it("hasType answers for a registered type and for one never registered", () => {
		const registry = createObjectDocValidatorRegistry();
		registry.register("rect", () => [], RectFeatures);

		expect(registry.hasType("rect")).toBe(true);
		expect(registry.hasType("no-such-type")).toBe(false);
	});

	it("hasType stays true for a type whose validator reports errors", () => {
		// Registration is what it answers about — whether a given doc passes is a
		// separate question, and the two are read together at the parse boundary.
		const registry = createObjectDocValidatorRegistry();
		registry.register(
			"rect",
			() => [{ path: "root[0]", message: "always fails" }],
			RectFeatures,
		);

		expect(registry.hasType("rect")).toBe(true);
	});
});
