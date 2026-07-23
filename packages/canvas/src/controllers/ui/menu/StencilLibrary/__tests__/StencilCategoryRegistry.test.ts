import { describe, it, expect } from "vitest";

import type { StencilCategory } from "../stencilCategories";
import { createStencilCategoryRegistry } from "../StencilCategoryRegistry";

const DummyIcon = () => null;

const category = (id: string, label: string): StencilCategory => ({
	id,
	label,
	icon: DummyIcon,
});

describe("StencilCategoryRegistry", () => {
	it("get は登録した category を返す", () => {
		const registry = createStencilCategoryRegistry();
		registry.register(category("basic", "Basic"));

		expect(registry.get("basic")?.label).toBe("Basic");
	});

	it("未登録 id には undefined を返す", () => {
		const registry = createStencilCategoryRegistry();

		expect(registry.get("missing")).toBeUndefined();
	});

	it("同一 id の再登録は最初のものを残す（先勝ち）", () => {
		const registry = createStencilCategoryRegistry();
		registry.register(category("basic", "Basic"));
		registry.register(category("basic", "Hijacked"));

		expect(registry.get("basic")?.label).toBe("Basic");
	});
});
