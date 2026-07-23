import { describe, it, expect } from "vitest";

import type { StencilPreset } from "../StencilPreset";
import { createStencilPresetRegistry } from "../StencilPresetRegistry";

const DummyIcon = () => null;

const preset = (id: string): StencilPreset => ({
	id,
	objectType: "rect",
	label: id,
	icon: DummyIcon,
});

describe("StencilPresetRegistry", () => {
	it("all は登録順で返す", () => {
		const registry = createStencilPresetRegistry();
		registry.register(preset("b"));
		registry.register(preset("a"));
		registry.register(preset("c"));

		expect(registry.all().map((p) => p.id)).toEqual(["b", "a", "c"]);
	});

	it("get は id で preset を引く。未登録は undefined", () => {
		const registry = createStencilPresetRegistry();
		registry.register(preset("rect"));

		expect(registry.get("rect")?.id).toBe("rect");
		expect(registry.get("missing")).toBeUndefined();
	});

	it("clear は登録内容をすべて捨てる", () => {
		const registry = createStencilPresetRegistry();
		registry.register(preset("rect"));
		registry.clear();

		expect(registry.all()).toEqual([]);
		expect(registry.get("rect")).toBeUndefined();
	});
});
