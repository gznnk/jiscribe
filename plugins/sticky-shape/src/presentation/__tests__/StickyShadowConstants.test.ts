import { describe, expect, it } from "vitest";

import {
	STICKY_SHADOW_OFFSET_Y,
	STICKY_SHADOW_SPREAD,
} from "../StickyShadowConstants";

describe("sticky shadow constants", () => {
	// The fade reaches `spread` above the shadow's rectangle, which sits
	// `offset` below the paper; wider than that and it shows above the note.
	it("keeps the fade under the paper at the top", () => {
		expect(STICKY_SHADOW_SPREAD).toBeLessThanOrEqual(STICKY_SHADOW_OFFSET_Y);
	});
});
