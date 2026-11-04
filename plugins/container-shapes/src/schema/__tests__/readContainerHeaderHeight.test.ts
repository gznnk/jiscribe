import type { ObjectDoc } from "@jiscribe/doc";
import { describe, expect, it } from "vitest";

import { containerDocDefinition } from "../../doc";
import { readContainerHeaderHeight } from "../calcContainerHeaderHeight";
import { CONTAINER_HEADER_HEIGHT } from "../ContainerDoc";

describe("readContainerHeaderHeight", () => {
	it("takes the document's own value, above the box height included", () => {
		expect(readContainerHeaderHeight({ headerHeight: 90, height: 40 })).toBe(
			90,
		);
	});

	it("falls back to the default when the document states none", () => {
		expect(readContainerHeaderHeight({})).toBe(CONTAINER_HEADER_HEIGHT);
	});

	it.each([0, -8, Number.NaN, Number.POSITIVE_INFINITY, "48"])(
		"falls back to the default for %s, which the validator would refuse",
		(headerHeight) => {
			expect(readContainerHeaderHeight({ headerHeight })).toBe(
				CONTAINER_HEADER_HEIGHT,
			);
		},
	);
});

describe("containerDocDefinition.container", () => {
	it("answers the document's header band as the title band a layout keeps clear", () => {
		const base: ObjectDoc = { id: "container-1", type: "container" };
		const banded = { ...base, headerHeight: 64 } as ObjectDoc;
		expect(containerDocDefinition.container?.(banded)).toEqual({
			titleHeight: 64,
		});
		expect(containerDocDefinition.container?.(base)).toEqual({
			titleHeight: CONTAINER_HEADER_HEIGHT,
		});
	});
});
