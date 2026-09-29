import { describe, expect, it } from "vitest";

import { RectFeatures } from "../../model/objects/primitives/rect/RectDoc";
import type { ObjectDocValidateFn } from "../../plugin/ObjectDocValidateFn";
import { createDocValidatorRegistry } from "../ObjectDocValidatorRegistry";

const noopValidate: ObjectDocValidateFn = () => [];

describe("ObjectDocValidatorRegistry", () => {
	it("hasType answers for a registered type and for one never registered", () => {
		const registry = createDocValidatorRegistry({
			presetDefinitions: {
				rect: { features: RectFeatures, validateDoc: noopValidate },
			},
		});

		expect(registry.hasType("rect")).toBe(true);
		expect(registry.hasType("no-such-type")).toBe(false);
	});

	it("hasType stays true for a type whose validator reports errors", () => {
		// Registration is what it answers about — whether a given doc passes is a
		// separate question, and the two are read together at the parse boundary.
		const registry = createDocValidatorRegistry({
			presetDefinitions: {
				rect: {
					features: RectFeatures,
					validateDoc: () => [
						{ path: "root[0]", message: "always fails", severity: "error" },
					],
				},
			},
		});

		expect(registry.hasType("rect")).toBe(true);
	});

	it("reports nothing at all for a type it does not hold", () => {
		// An object of an unknown type is opaque: its fields are not ours to judge.
		const registry = createDocValidatorRegistry({ presetDefinitions: {} });
		expect(
			registry.validate("hexagram", { id: "u", zzUnknown: 1 }, "root[0]"),
		).toEqual([]);
	});
});
