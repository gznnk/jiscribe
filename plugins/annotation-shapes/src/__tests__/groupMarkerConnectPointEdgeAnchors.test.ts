import type { ObjectDoc, ObjectDocDefinition } from "@jiscribe/doc";
import type { Point } from "@jiscribe/geometry";
import { describe, expect, it } from "vitest";

import {
	braceDocDefinition,
	bracketDocDefinition,
	bracketWithStemDocDefinition,
} from "../doc";
import { calcGroupMarkerConnectPoints } from "../presentation/shared/groupMarkerConnectPoints";
import type { GroupMarkerDirection } from "../schema/shared/GroupMarkerFields";

/** Where `t` along `side` of a box lies, local to the box's centre. */
const calcLocalEdgePoint = (
	{ width, height }: { width: number; height: number },
	side: "top" | "right" | "bottom" | "left",
	t: number,
): Point => {
	switch (side) {
		case "top":
			return { x: -width / 2 + width * t, y: -height / 2 };
		case "bottom":
			return { x: -width / 2 + width * t, y: height / 2 };
		case "left":
			return { x: -width / 2, y: -height / 2 + height * t };
		case "right":
			return { x: width / 2, y: -height / 2 + height * t };
	}
};

const DIRECTIONS: readonly GroupMarkerDirection[] = [
	"left",
	"right",
	"up",
	"down",
];

/** A thin band along the span: 24 by 160 facing left or right, 160 by 24 facing up or down. */
const bandFor = (direction: GroupMarkerDirection) =>
	direction === "left" || direction === "right"
		? { width: 24, height: 160 }
		: { width: 160, height: 24 };

const cases = [
	{ type: "brace", definition: braceDocDefinition, tipPositions: [0.25] },
	{ type: "bracket", definition: bracketDocDefinition, tipPositions: [] },
	{
		type: "bracketWithStem",
		definition: bracketWithStemDocDefinition,
		tipPositions: [0.25],
	},
] as const satisfies readonly {
	type: string;
	definition: ObjectDocDefinition;
	tipPositions: readonly number[];
}[];

describe("group marker extraConnectPointEdgeAnchors", () => {
	describe.each(cases)("$type", ({ type, definition, tipPositions }) => {
		const placements = DIRECTIONS.flatMap((direction) => [
			{ direction, tipPosition: undefined },
			...tipPositions.map((tipPosition) => ({ direction, tipPosition })),
		]);

		it.each(placements)(
			"places the tip where the presentation does (direction $direction, tipPosition $tipPosition)",
			({ direction, tipPosition }) => {
				const band = bandFor(direction);
				const doc = {
					id: `${type}-1`,
					type,
					x: 0,
					y: 0,
					...band,
					direction,
					...(tipPosition !== undefined ? { tipPosition } : {}),
				} as ObjectDoc;

				const anchors = definition.extraConnectPointEdgeAnchors?.(doc);

				expect(anchors).toHaveLength(1);
				const [tip] = anchors ?? [];
				expect(tip.id).toBe("tip");
				expect(tip).not.toHaveProperty("alternateGroup");
				const [placed] = calcGroupMarkerConnectPoints({
					...band,
					direction,
					...(tipPosition !== undefined ? { tipPosition } : {}),
				});
				expect(calcLocalEdgePoint(band, tip.side, tip.t)).toEqual(placed.point);
			},
		);
	});
});
