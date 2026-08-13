import { describe, it, expect } from "vitest";

import { RecordStencils } from "../RecordStencils";

/** The name slot a preset starts its box with, read off the preset's overrides. */
const findNameSlot = (stencilId: string): Record<string, unknown> => {
	const stencil = RecordStencils.find(({ id }) => id === stencilId);
	expect(stencil, `no stencil with id "${stencilId}"`).toBeDefined();
	const text = stencil?.defaultOverrides?.text as
		Record<string, Record<string, unknown>> | undefined;
	expect(
		text?.name,
		`stencil "${stencilId}" writes no name slot`,
	).toBeDefined();
	return text?.name ?? {};
};

describe("RecordStencils", () => {
	it("underlines the object preset's name, as UML marks an instance", () => {
		expect(findNameSlot("object").textDecoration).toBe("underline");
	});

	it("leaves every other preset's name undecorated", () => {
		for (const { id } of RecordStencils.filter(({ id }) => id !== "object")) {
			expect(findNameSlot(id).textDecoration, id).toBeUndefined();
		}
	});
});
