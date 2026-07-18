import { describe, it, expect } from "vitest";

import type { ShapePreset } from "../../ui/objects/types/ShapePreset";
import { createShapePresetRegistry } from "../ShapePresetRegistry";

const DummyIcon = () => null;

const preset = (
	id: string,
	categories?: Record<string, number>,
): ShapePreset => ({
	id,
	objectType: "rect",
	label: id,
	categories,
	icon: DummyIcon,
});

describe("ShapePresetRegistry", () => {
	it("byCategory はカテゴリ内 order（categories の値）昇順で返す", () => {
		const registry = createShapePresetRegistry();
		// 登録順とカテゴリ内順序が食い違うように値を仕込む。
		registry.register(preset("b", { flowchart: 20 }));
		registry.register(preset("a", { flowchart: 10 }));
		registry.register(preset("x", { basic: 10 }));

		expect(registry.byCategory("flowchart").map((p) => p.id)).toEqual([
			"a",
			"b",
		]);
		expect(registry.byCategory("basic").map((p) => p.id)).toEqual(["x"]);
	});

	it("多重所属の preset は各カテゴリでそれぞれの order 位置に現れる", () => {
		const registry = createShapePresetRegistry();
		// rect は basic では後方(30)、flowchart では前方(10)に置きたい。
		registry.register(preset("rect", { basic: 30, flowchart: 10 }));
		registry.register(preset("diamond", { flowchart: 20 }));
		registry.register(preset("ellipse", { basic: 10 }));

		expect(registry.byCategory("basic").map((p) => p.id)).toEqual([
			"ellipse",
			"rect",
		]);
		expect(registry.byCategory("flowchart").map((p) => p.id)).toEqual([
			"rect",
			"diamond",
		]);
	});

	it("categories を持たない preset はどのカテゴリにも現れない", () => {
		const registry = createShapePresetRegistry();
		registry.register(preset("loose"));

		expect(registry.byCategory("basic")).toEqual([]);
		expect(registry.byCategory("flowchart")).toEqual([]);
	});
});
