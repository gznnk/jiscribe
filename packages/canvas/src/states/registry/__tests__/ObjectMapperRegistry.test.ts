import { describe, it, expect } from "vitest";

import { RectFeatures } from "../../../schemas/objects/primitives/rect/RectDoc";
import type { RectDoc } from "../../../schemas/objects/primitives/rect/RectDoc";
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
	it("toState した state の features は登録済み記述子と同一参照（コピーではない）", () => {
		// 参照が複製されると memo の shallow compare が毎回不一致になり
		// 全オブジェクト再レンダーを引き起こすため、同一参照は不変条件。
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

	it("toDoc に features は漏れない（allow-list pick）", () => {
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
