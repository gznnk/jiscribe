import { describe, expect, it } from "vitest";

import { generalPlugin } from "../plugin";

/**
 * Without an `outline` a shape falls back to its bounding box, which for a
 * pictogram can miss badly — the gear never reaches a box corner at all, and the
 * laptop's top corners are empty. Those defaults are invisible until someone
 * draws a connector, so the requirement is asserted here rather than left to
 * review.
 *
 * `actor` is the one shape that legitimately has none: a stick figure encloses
 * nothing, and it carries a full-box hit area for the same reason.
 */
const NO_SILHOUETTE_TYPES = new Set(["actor"]);

describe("general shapes outline coverage", () => {
	it("declares an outline for every shape that has a silhouette", () => {
		const missing = Object.entries(generalPlugin.objects ?? {})
			.filter(
				([type, definition]) =>
					!NO_SILHOUETTE_TYPES.has(type) && definition?.outline === undefined,
			)
			.map(([type]) => type);
		expect(missing).toEqual([]);
	});

	it("keeps the exception list honest", () => {
		for (const type of NO_SILHOUETTE_TYPES) {
			expect(generalPlugin.objects?.[type]?.outline).toBeUndefined();
		}
	});
});
