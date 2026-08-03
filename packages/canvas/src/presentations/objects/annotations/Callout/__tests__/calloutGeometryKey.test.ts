import { describe, it, expect } from "vitest";

import type { CalloutTail } from "../../../../../schemas/objects/annotations/callout/CalloutDoc";
import { CALLOUT_TAIL_DEFAULT } from "../../../../../schemas/objects/annotations/callout/CalloutDoc";
import { calloutGeometryKey } from "../calloutGeometryKey";

/** Only id / type / tail are read, so the rest of the callout state is omitted. */
const calloutWith = (tail?: CalloutTail) => ({
	id: "callout-1",
	type: "callout" as const,
	tail,
});

describe("calloutGeometryKey", () => {
	it("gives an absent tail and an explicit default tail the same key", () => {
		expect(calloutGeometryKey(calloutWith())).toBe(
			calloutGeometryKey(calloutWith({ ...CALLOUT_TAIL_DEFAULT })),
		);
	});

	it("separates tails differing in side alone", () => {
		expect(
			calloutGeometryKey(calloutWith({ side: "left", position: 0.2 })),
		).not.toBe(
			calloutGeometryKey(calloutWith({ side: "right", position: 0.2 })),
		);
	});

	it("separates tails differing in position alone", () => {
		expect(
			calloutGeometryKey(calloutWith({ side: "bottom", position: 0.2 })),
		).not.toBe(
			calloutGeometryKey(calloutWith({ side: "bottom", position: 0.8 })),
		);
	});
});
