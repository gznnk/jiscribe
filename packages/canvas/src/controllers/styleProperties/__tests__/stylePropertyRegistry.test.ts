import { describe, it, expect } from "vitest";

import type { StyleValueType } from "../../../schemas/objects/types/ExtraStyleProperty";
import type { ObjectFeatures } from "../../../schemas/objects/types/ObjectFeatures";
import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { CanvasControllerState } from "../../CanvasTypes";
import { createTestRegistries } from "../../registries/createCanvasRegistries";
import { ALL_OBJECT_DEFINITIONS } from "../../registries/initializeObjectRegistry";
import { FeatureGatedStyleProperty } from "../FeatureGatedStyleProperty";
import { SYSTEM_STYLE_PROPERTIES } from "../systemStyleProperties";

const VALID_INPUT: Record<StyleValueType, string> = {
	string: "test-value",
	number: "7",
	boolean: "true",
};

const EXPECTED_OUTPUT: Record<StyleValueType, string | number | boolean> = {
	string: "test-value",
	number: 7,
	boolean: true,
};

// The registry under test is taken from the real bundle wiring, so these tests
// also guard that createCanvasRegistries registers the system handlers and
// every ObjectTypeDefinition.extraStyleProperties declaration.
const { styleProperty: registry } = createTestRegistries();

/** Every shape-declared extra property wired via ALL_OBJECT_DEFINITIONS. */
const EXTRA_DECLARATIONS = Object.entries(ALL_OBJECT_DEFINITIONS).flatMap(
	([type, definition]) =>
		Object.entries(definition.extraStyleProperties ?? {}).map(
			([property, descriptor]) => ({ type, property, descriptor }),
		),
);

const makeState = (
	overrides: Partial<
		Pick<
			CanvasControllerState,
			"selectedIds" | "selectedConnectorId" | "objects" | "multiSelectGroup"
		>
	>,
): CanvasControllerState =>
	({
		selectedIds: [],
		selectedConnectorId: null,
		objects: {},
		multiSelectGroup: null,
		selectedTextSlot: null,
		...overrides,
	}) as unknown as CanvasControllerState;

/** Pre-creates the parent chain for a dot-path property ("label.fill" → { label: {} }). */
const parentScaffold = (path: readonly string[]): Record<string, unknown> => {
	if (path.length <= 1) {
		return {};
	}
	const [head, ...rest] = path;
	return { [head]: parentScaffold(rest) };
};

const readAtPath = (obj: unknown, path: readonly string[]): unknown =>
	path.reduce(
		(acc, key) => (acc as Record<string, unknown> | undefined)?.[key],
		obj,
	);

const featureGatedEntries = Object.entries(SYSTEM_STYLE_PROPERTIES).filter(
	(entry): entry is [string, FeatureGatedStyleProperty] =>
		entry[1] instanceof FeatureGatedStyleProperty,
);

describe("system style properties (feature-gated, registry-driven)", () => {
	for (const [property, handler] of featureGatedEntries) {
		const validValue = VALID_INPUT[handler.valueType];
		const expected = EXPECTED_OUTPUT[handler.valueType];

		it(`${property}: applied and coerced when the "${handler.gate}" feature is on`, () => {
			const features = {
				type: "rect",
				geometry: "rect",
				[handler.gate]: true,
			} as ObjectFeatures;
			const o1 = { id: "o1", type: "rect", features } as ObjectState;
			const state = makeState({ selectedIds: ["o1"], objects: { o1 } });
			const result = registry.apply(state, property, validValue);
			expect(readAtPath(result.objects["o1"], [property])).toBe(expected);
		});

		it(`${property}: no-op when the "${handler.gate}" feature is off`, () => {
			const features = { type: "rect", geometry: "rect" } as ObjectFeatures;
			const o1 = { id: "o1", type: "rect", features } as ObjectState;
			const state = makeState({ selectedIds: ["o1"], objects: { o1 } });
			expect(registry.apply(state, property, validValue)).toBe(state);
		});

		if (handler.valueType === "number") {
			it(`${property}: non-numeric value -> no-op`, () => {
				const features = {
					type: "rect",
					geometry: "rect",
					[handler.gate]: true,
				} as ObjectFeatures;
				const o1 = { id: "o1", type: "rect", features } as ObjectState;
				const state = makeState({ selectedIds: ["o1"], objects: { o1 } });
				expect(registry.apply(state, property, "abc")).toBe(state);
			});
		}
	}
});

describe("shape-declared extra properties (registry-driven)", () => {
	it("the wiring exposes at least one extra declaration (e.g. connector label.*)", () => {
		expect(EXTRA_DECLARATIONS.length).toBeGreaterThan(0);
	});

	for (const { type, property, descriptor } of EXTRA_DECLARATIONS) {
		const path = property.split(".");
		const validValue = VALID_INPUT[descriptor.valueType];
		const expected = EXPECTED_OUTPUT[descriptor.valueType];

		it(`${type} / ${property}: applied and coerced on the declaring shape`, () => {
			const o1 = {
				id: "o1",
				type,
				features: { type, geometry: "rect" },
				...parentScaffold(path),
			} as unknown as ObjectState;
			const state = makeState({ selectedIds: ["o1"], objects: { o1 } });
			const result = registry.apply(state, property, validValue);
			expect(readAtPath(result.objects["o1"], path)).toBe(expected);
		});

		it(`${type} / ${property}: no-op on an undeclared shape (rect)`, () => {
			const o1 = {
				id: "o1",
				type: "rect",
				features: { type: "rect", geometry: "rect" },
				...parentScaffold(path),
			} as unknown as ObjectState;
			const state = makeState({ selectedIds: ["o1"], objects: { o1 } });
			expect(registry.apply(state, property, validValue)).toBe(state);
		});

		if (path.length > 1) {
			it(`${type} / ${property}: no-op when the parent object is missing`, () => {
				const o1 = {
					id: "o1",
					type,
					features: { type, geometry: "rect" },
				} as unknown as ObjectState;
				const state = makeState({ selectedIds: ["o1"], objects: { o1 } });
				expect(registry.apply(state, property, validValue)).toBe(state);
			});
		}
	}
});

describe("registry consistency", () => {
	it("shape-declared property names do not shadow system properties", () => {
		const systemNames = new Set<string>(Object.keys(SYSTEM_STYLE_PROPERTIES));
		for (const { property } of EXTRA_DECLARATIONS) {
			expect(
				systemNames.has(property),
				`"${property}" is declared as a shape extra but already exists as a system property`,
			).toBe(false);
		}
	});

	it("shapes declaring the same property name agree on its valueType", () => {
		const seenValueTypes = new Map<string, StyleValueType>();
		for (const { property, descriptor } of EXTRA_DECLARATIONS) {
			const seen = seenValueTypes.get(property);
			if (seen !== undefined) {
				expect(
					descriptor.valueType,
					`"${property}" is declared with conflicting valueTypes across shapes`,
				).toBe(seen);
			}
			seenValueTypes.set(property, descriptor.valueType);
		}
	});
});
