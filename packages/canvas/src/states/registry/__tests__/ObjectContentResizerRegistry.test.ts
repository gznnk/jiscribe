import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../objects/base/ObjectState";
import type { ObjectContentResizer } from "../ObjectContentResizerRegistry";
import { createObjectContentResizerRegistry } from "../ObjectContentResizerRegistry";

const identityResizer: ObjectContentResizer = (state) => state;

describe("ObjectContentResizerRegistry", () => {
	it("resolves a registered type to the very function that was registered", () => {
		const registry = createObjectContentResizerRegistry();
		registry.register("text", identityResizer);

		expect(registry.get("text")).toBe(identityResizer);
	});

	it("resolves an unregistered type to undefined, which is what makes a type keep its stored box", () => {
		const registry = createObjectContentResizerRegistry();
		registry.register("text", identityResizer);

		expect(registry.get("rect")).toBeUndefined();
	});

	it("hands the context through to the resizer", () => {
		const registry = createObjectContentResizerRegistry();
		registry.register("text", (state, context) => ({
			...state,
			id: context.fontFamily,
		}));

		const resized = registry.get("text")?.(
			{ id: "t1", type: "text" },
			{
				fontFamily: "Noto Sans JP",
			},
		) as ObjectState;
		expect(resized.id).toBe("Noto Sans JP");
	});

	it("forgets every registration on clear, so a rebuilt bundle starts empty", () => {
		const registry = createObjectContentResizerRegistry();
		registry.register("text", identityResizer);
		registry.clear();

		expect(registry.get("text")).toBeUndefined();
	});
});
