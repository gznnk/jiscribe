import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { ConnectorState } from "../../../states/objects/connector/ConnectorState";
import type { GroupState } from "../../../states/objects/primitives/group/GroupState";
import { outlinedPlugin } from "../../__tests__/support/outlinedPlugin";
import { createCanvasRegistries } from "../../registries/createCanvasRegistries";
import { hitTestObjects } from "../hitTestObjects";

const registries = createCanvasRegistries({ plugins: [outlinedPlugin] });

const frame = (
	id: string,
	type: string,
	overrides: Record<string, unknown> = {},
): ObjectState =>
	({
		id,
		type,
		cx: 0,
		cy: 0,
		width: 40,
		height: 20,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
		...overrides,
	}) as unknown as ObjectState;

const poly = (
	id: string,
	points: Array<{ x: number; y: number }>,
	features?: Record<string, unknown>,
): ObjectState =>
	({ id, type: "polyline", points, features }) as unknown as ObjectState;

/** Straight connector along y = 0, from x 0 to x 100, attached to nothing. */
const straightConnector = (id: string): ConnectorState =>
	({
		id,
		type: "connector",
		points: [],
		routing: "straight",
		source: { anchor: { kind: "free", point: { x: 0, y: 0 } } },
		target: { anchor: { kind: "free", point: { x: 100, y: 0 } } },
	}) as unknown as ConnectorState;

const toMap = (objects: ObjectState[]): Record<string, ObjectState> =>
	Object.fromEntries(objects.map((object) => [object.id, object]));

describe("hitTestObjects", () => {
	it("hits a rect inside its box and misses outside it", () => {
		const objects = toMap([frame("r1", "rect")]);
		expect(hitTestObjects({ x: 5, y: 5 }, objects, ["r1"], registries)).toEqual(
			["r1"],
		);
		expect(
			hitTestObjects({ x: 30, y: 0 }, objects, ["r1"], registries),
		).toEqual([]);
	});

	it("misses the corner of an ellipse's box, which the ellipse does not fill", () => {
		const objects = toMap([
			frame("e1", "ellipse", {
				features: { type: "ellipse", geometry: "ellipse" },
			}),
		]);
		// (19, 9) is inside the 40x20 box but outside the inscribed ellipse.
		expect(
			hitTestObjects({ x: 19, y: 9 }, objects, ["e1"], registries),
		).toEqual([]);
		expect(hitTestObjects({ x: 0, y: 0 }, objects, ["e1"], registries)).toEqual(
			["e1"],
		);
	});

	it("tests the rotated shape rather than its upright box", () => {
		// 10x60 upright, turned a quarter turn: it now reaches along x, not y.
		const objects = toMap([
			frame("r1", "rect", { width: 10, height: 60, rotation: 90 }),
		]);
		expect(
			hitTestObjects({ x: 25, y: 0 }, objects, ["r1"], registries),
		).toEqual(["r1"]);
		expect(
			hitTestObjects({ x: 0, y: 25 }, objects, ["r1"], registries),
		).toEqual([]);
	});

	it("tests the drawn silhouette of a type that registers an outline", () => {
		// The `outlined` type gives up the bottom quarter of its box (200x100).
		const objects = toMap([
			frame("o1", "outlined", {
				width: 200,
				height: 100,
				features: { type: "outlined", geometry: "rect" },
			}),
		]);
		expect(hitTestObjects({ x: 0, y: 0 }, objects, ["o1"], registries)).toEqual(
			["o1"],
		);
		expect(
			hitTestObjects({ x: 0, y: 40 }, objects, ["o1"], registries),
		).toEqual([]);
	});

	it("hits a polyline within the tolerance of its line and misses beyond it", () => {
		const objects = toMap([
			poly("p1", [
				{ x: 0, y: 0 },
				{ x: 100, y: 0 },
			]),
		]);
		// Default tolerance 4 plus half the assumed 1px stroke.
		expect(
			hitTestObjects({ x: 50, y: 4 }, objects, ["p1"], registries),
		).toEqual(["p1"]);
		expect(
			hitTestObjects({ x: 50, y: 6 }, objects, ["p1"], registries),
		).toEqual([]);
		expect(
			hitTestObjects({ x: 50, y: 6 }, objects, ["p1"], registries, 10),
		).toEqual(["p1"]);
	});

	it("hits the inside of a filled poly shape, which a polyline has none of", () => {
		const square = [
			{ x: 0, y: 0 },
			{ x: 100, y: 0 },
			{ x: 100, y: 100 },
			{ x: 0, y: 100 },
		];
		const filled = toMap([
			poly("p1", square, { type: "polygon", geometry: "poly", fill: true }),
		]);
		const open = toMap([poly("p1", square)]);
		expect(
			hitTestObjects({ x: 50, y: 50 }, filled, ["p1"], registries),
		).toEqual(["p1"]);
		expect(hitTestObjects({ x: 50, y: 50 }, open, ["p1"], registries)).toEqual(
			[],
		);
	});

	it("hits a connector along the line it is drawn on", () => {
		const objects = toMap([straightConnector("c1")]);
		expect(
			hitTestObjects({ x: 50, y: 2 }, objects, ["c1"], registries),
		).toEqual(["c1"]);
		expect(
			hitTestObjects({ x: 50, y: 30 }, objects, ["c1"], registries),
		).toEqual([]);
	});

	it("reports a group's members, never the group itself", () => {
		const child = frame("r1", "rect", { parentId: "g1" });
		const group = {
			id: "g1",
			type: "group",
			childIds: ["r1"],
		} as unknown as GroupState;
		const objects = toMap([child, group]);
		expect(hitTestObjects({ x: 0, y: 0 }, objects, ["g1"], registries)).toEqual(
			["r1"],
		);
	});

	it("skips a type that draws no geometry", () => {
		const objects = toMap([
			frame("n1", "note", { features: { type: "note", geometry: "none" } }),
		]);
		expect(hitTestObjects({ x: 0, y: 0 }, objects, ["n1"], registries)).toEqual(
			[],
		);
	});

	it("orders overlapping hits front-most first", () => {
		const objects = toMap([frame("back", "rect"), frame("front", "rect")]);
		expect(
			hitTestObjects({ x: 0, y: 0 }, objects, ["back", "front"], registries),
		).toEqual(["front", "back"]);
	});

	it("collects everything reaching into a rect target", () => {
		const objects = toMap([
			frame("near", "rect", { cx: 0, cy: 0 }),
			frame("far", "rect", { cx: 500, cy: 500 }),
		]);
		expect(
			hitTestObjects(
				{ x: -10, y: -10, width: 20, height: 20 },
				objects,
				["near", "far"],
				registries,
			),
		).toEqual(["near"]);
	});
});
