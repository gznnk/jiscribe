import { RectFeatures } from "@jiscribe/doc/model/objects/primitives/rect/RectDoc";
import type { RectDoc } from "@jiscribe/doc/model/objects/primitives/rect/RectDoc";
import { describe, it, expect } from "vitest";

import {
	rectToDoc,
	rectToState,
} from "../../objects/primitives/rect/RectMapper";
import { createObjectMapperRegistry } from "../ObjectMapperRegistry";

const rectDoc = {
	id: "rect-1",
	type: "rect",
	x: 0,
	y: 0,
	width: 100,
	height: 60,
	rotation: 0,
	flipX: false,
	flipY: false,
} as unknown as RectDoc;

describe("ObjectMapperRegistry", () => {
	it("the features of a toState result are the same reference as the registered descriptor (not a copy)", () => {
		// if the reference were copied, memo's shallow compare would mismatch
		// every time and force a re-render of all objects, so reference identity
		// is an invariant.
		const registry = createObjectMapperRegistry();
		registry.register(
			"rect",
			{ toState: rectToState, toDoc: rectToDoc },
			RectFeatures,
		);

		const state = registry.toState(rectDoc);

		expect(state.features).toBe(RectFeatures);
		expect(state.features).toBe(registry.getFeatures("rect"));
	});

	it("features do not leak into toDoc (allow-list pick)", () => {
		const registry = createObjectMapperRegistry();
		registry.register(
			"rect",
			{ toState: rectToState, toDoc: rectToDoc },
			RectFeatures,
		);

		const doc = registry.toDoc(registry.toState(rectDoc));

		expect("features" in doc).toBe(false);
	});
});
