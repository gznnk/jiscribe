import { describe, it, expect } from "vitest";

import { ICON_NODES } from "../../schema/icon/iconData.generated";
import { lucideIconStencilCategory } from "../IconStencilCategory";
import { ICON_STENCIL_IDS, IconStencils } from "../IconStencils";

const search = lucideIconStencilCategory.search;
const registeredIds = new Set(IconStencils.map((stencil) => stencil.id));

describe("IconStencils", () => {
	it("registers every icon in the set under its own id", () => {
		expect(IconStencils).toHaveLength(Object.keys(ICON_NODES).length);
		expect(registeredIds.size).toBe(IconStencils.length);
	});

	it("keeps the flyout to its 24 icons, all registered", () => {
		expect(ICON_STENCIL_IDS).toHaveLength(24);
		expect(ICON_STENCIL_IDS[0]).toBe("lucideIconUser");
		expect(ICON_STENCIL_IDS).toContain("lucideIconFileText");
		expect(lucideIconStencilCategory.presetIds).toEqual(ICON_STENCIL_IDS);
		for (const id of ICON_STENCIL_IDS) {
			expect(registeredIds).toContain(id);
		}
	});
});

describe("lucideIconStencilCategory.search", () => {
	it("ranks the exact name first and answers with registered ids", () => {
		const result = search!("lock");

		expect(result.presetIds[0]).toBe("lucideIconLock");
		expect(result.matchCount).toBeGreaterThanOrEqual(result.presetIds.length);
		for (const id of result.presetIds) {
			expect(registeredIds).toContain(id);
		}
	});

	it("answers an empty query with nothing rather than failing", () => {
		expect(search!("")).toEqual({ presetIds: [], matchCount: 0 });
	});
});
