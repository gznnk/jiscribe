import { describe, expect, it } from "vitest";

import { createObjectSvgDefsRegistry } from "../ObjectSvgDefsRegistry";

const AlphaDefs = () => null;
const BetaDefs = () => null;
const AlphaDefsV2 = () => null;

describe("ObjectSvgDefsRegistry", () => {
	it("returns the contributions in registration order", () => {
		const registry = createObjectSvgDefsRegistry();
		registry.register("alpha", AlphaDefs);
		registry.register("beta", BetaDefs);

		expect(registry.all()).toEqual([
			{ type: "alpha", Component: AlphaDefs },
			{ type: "beta", Component: BetaDefs },
		]);
	});

	// Two entries for one type would repeat the React key CanvasDefs renders them
	// under, costing one of the two subtrees and the ids it holds.
	it("keeps one entry per type when a type is registered again", () => {
		const registry = createObjectSvgDefsRegistry();
		registry.register("alpha", AlphaDefs);
		registry.register("beta", BetaDefs);
		registry.register("alpha", AlphaDefsV2);

		// The later component wins, at the place the type first took.
		expect(registry.all()).toEqual([
			{ type: "alpha", Component: AlphaDefsV2 },
			{ type: "beta", Component: BetaDefs },
		]);
	});

	it("drops every contribution on clear", () => {
		const registry = createObjectSvgDefsRegistry();
		registry.register("alpha", AlphaDefs);
		registry.clear();

		expect(registry.all()).toEqual([]);
	});
});
