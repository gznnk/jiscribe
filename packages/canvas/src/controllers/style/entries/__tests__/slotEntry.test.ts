import { describe, expect, it } from "vitest";

import { createTestRegistries } from "../../../registries/createCanvasRegistries";
import {
	contextOf,
	rectOf,
	slotPickOf,
} from "../../__tests__/support/styleFixtures";
import { selectedSlotIds } from "../slotEntry";

// The bundle applyObjectDefinition built, rather than a hand-made registry: the
// rect's textSlot kind is the one it registers for every text-holding type.
const { objectPartKind } = createTestRegistries();

describe("selectedSlotIds", () => {
	it("resolves a rect's body pick through the registered textSlot kind", () => {
		const rect = rectOf("a", { text: { body: { text: "hi" } } });
		expect(
			selectedSlotIds(rect, slotPickOf("body"), contextOf({ objectPartKind })),
		).toEqual(["body"]);
	});

	it("addresses the rect's body with nothing picked, as before", () => {
		const rect = rectOf("a", { text: { body: { text: "hi" } } });
		expect(selectedSlotIds(rect, null, contextOf({ objectPartKind }))).toEqual([
			"body",
		]);
	});
});
