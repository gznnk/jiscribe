import type { Stencil } from "@jiscribe/canvas";
import { describe, it, expect } from "vitest";

import { createTypeStencils } from "../createTypeStencils";

/** Stands in for the palette icon; never rendered here. */
const icon = () => null;

const preset = (
	overrides: Partial<Omit<Stencil, "id">> = {},
): Omit<Stencil, "id"> => ({
	objectType: "rect",
	label: "Rect",
	icon,
	...overrides,
});

describe("createTypeStencils", () => {
	it("offers exactly one preset", () => {
		expect(createTypeStencils(preset())).toHaveLength(1);
	});

	it("takes the object type as the id, which host label overrides look up", () => {
		expect(createTypeStencils(preset()).at(0)?.id).toBe("rect");
	});

	it("carries the preset's own fields over untouched", () => {
		const defaultOverrides = { fill: "#fff" };
		expect(
			createTypeStencils(preset({ label: "四角", defaultOverrides })).at(0),
		).toEqual({
			id: "rect",
			objectType: "rect",
			label: "四角",
			icon,
			defaultOverrides,
		});
	});

	it("keeps a per-locale label as it is, resolving it is the host's job", () => {
		const label = { en: "Rect", ja: "四角" };
		expect(createTypeStencils(preset({ label })).at(0)?.label).toBe(label);
	});

	it("lets the preset override the id it would otherwise derive", () => {
		// `id` is spread after `objectType`, so a preset written with one wins.
		const withId = { ...preset(), id: "process" } as Omit<Stencil, "id">;
		expect(createTypeStencils(withId).at(0)?.id).toBe("process");
	});

	it("builds a fresh array each call, so one type's palette cannot mutate another's", () => {
		const first = createTypeStencils(preset());
		const second = createTypeStencils(preset());
		expect(first).not.toBe(second);
		expect(first.at(0)).not.toBe(second.at(0));
	});
});
