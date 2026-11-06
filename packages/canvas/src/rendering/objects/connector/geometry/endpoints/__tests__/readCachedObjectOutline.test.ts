import type { Dimensions, Point } from "@jiscribe/geometry";
import { describe, expect, it, vi } from "vitest";

import type { ObjectState } from "../../../../../../states/objects/base/ObjectState";
import { createObjectOutlineRegistry } from "../../../../registry/ObjectOutlineRegistry";
import { readCachedObjectOutline } from "../readCachedObjectOutline";

const diamondOf = ({ width, height }: Dimensions): Point[] => [
	{ x: 0, y: -height / 2 },
	{ x: width / 2, y: 0 },
	{ x: 0, y: height / 2 },
	{ x: -width / 2, y: 0 },
];

const stateOf = (type: string): ObjectState & Dimensions =>
	({ id: "shape", type, width: 100, height: 60 }) as unknown as ObjectState &
		Dimensions;

describe("readCachedObjectOutline", () => {
	it("computes the outline of the same state once", () => {
		const calculator = vi.fn(diamondOf);
		const registry = createObjectOutlineRegistry();
		registry.register("diamond", calculator);
		const state = stateOf("diamond");

		const first = readCachedObjectOutline(state, registry);
		const second = readCachedObjectOutline(state, registry);

		expect(second).toBe(first);
		expect(first).toEqual(diamondOf(state));
		expect(calculator).toHaveBeenCalledTimes(1);
	});

	it("computes again for another state of the same type and size", () => {
		const calculator = vi.fn(diamondOf);
		const registry = createObjectOutlineRegistry();
		registry.register("diamond", calculator);

		const first = readCachedObjectOutline(stateOf("diamond"), registry);
		const second = readCachedObjectOutline(stateOf("diamond"), registry);

		expect(second).not.toBe(first);
		expect(calculator).toHaveBeenCalledTimes(2);
	});

	it("keeps each registry's outline apart for the same state", () => {
		const narrowRegistry = createObjectOutlineRegistry();
		narrowRegistry.register("diamond", diamondOf);
		const wideRegistry = createObjectOutlineRegistry();
		wideRegistry.register("diamond", ({ width, height }) =>
			diamondOf({ width: width * 2, height }),
		);
		const state = stateOf("diamond");

		const narrow = readCachedObjectOutline(state, narrowRegistry);
		const wide = readCachedObjectOutline(state, wideRegistry);

		expect(narrow?.[1]).toEqual({ x: 50, y: 0 });
		expect(wide?.[1]).toEqual({ x: 100, y: 0 });
	});

	it("computes again once the type is registered with another calculator", () => {
		const registry = createObjectOutlineRegistry();
		registry.register("diamond", diamondOf);
		const state = stateOf("diamond");
		const first = readCachedObjectOutline(state, registry);

		const replacement = vi.fn(diamondOf);
		registry.register("diamond", replacement);
		const second = readCachedObjectOutline(state, registry);

		expect(second).not.toBe(first);
		expect(replacement).toHaveBeenCalledTimes(1);
	});

	it("answers undefined for a type that registers no outline", () => {
		const registry = createObjectOutlineRegistry();
		registry.register("diamond", diamondOf);

		expect(readCachedObjectOutline(stateOf("rect"), registry)).toBeUndefined();
	});
});
