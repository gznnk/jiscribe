import { describe, expect, it } from "vitest";

import { gcpIconCatalog } from "../gcpIconCatalog";
import { GCP_TIER1_ICON_NAMES } from "../tier1Icons";

const { search, suggestNames } = gcpIconCatalog;

describe("gcpIconCatalog.search", () => {
	it("shows the palette for an empty term", () => {
		expect(search("")).toEqual({
			names: [...GCP_TIER1_ICON_NAMES],
			total: GCP_TIER1_ICON_NAMES.length,
		});
	});

	it("finds an icon through its short name, a product it draws, and its category", () => {
		expect(search("gce").names).toContain("compute-engine");
		expect(search("dataflow").names).toContain("data-analytics");
		expect(search("Security and Identity").names).toContain("mandiant");
	});

	it("puts a name opening with the term first", () => {
		expect(search("cloud run").names[0]).toBe("cloud-run");
	});
});

describe("gcpIconCatalog.suggestNames", () => {
	it("finds a name one typo away, or one a word short", () => {
		expect(suggestNames("compute-engin")).toContain("compute-engine");
		expect(suggestNames("security-center")).toContain(
			"security-command-center",
		);
	});
});
