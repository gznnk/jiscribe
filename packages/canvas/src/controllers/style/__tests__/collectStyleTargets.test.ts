import { describe, it, expect } from "vitest";

import {
	connectorOf,
	ellipseOf,
	groupOf,
	rectOf,
	stateOf,
} from "./support/styleFixtures";
import { TEXT_SLOT_PART_KIND } from "../../selection/textSlotPartKind";
import { collectSelectionObjects } from "../../ui/menu/utils/collectSelectionObjects";
import { collectStyleTargets } from "../collectStyleTargets";

const partOf = (slotId: string) => ({
	kind: TEXT_SLOT_PART_KIND,
	ranges: [{ anchorId: slotId, focusId: slotId }],
});

describe("collectStyleTargets", () => {
	it("nothing selected → no targets", () => {
		expect(collectStyleTargets(stateOf([], {}))).toEqual([]);
	});

	it("an id the objects no longer hold is skipped", () => {
		const a = rectOf("a");
		const targets = collectStyleTargets(stateOf(["gone", "a"], { a }));
		expect(targets.map((target) => target.object.id)).toEqual(["a"]);
	});

	it("a selected object is a target of its own", () => {
		const a = rectOf("a");
		expect(collectStyleTargets(stateOf(["a"], { a }))).toEqual([
			{ object: a, pick: null, selected: true },
		]);
	});

	it("a selected connector is a target like any other", () => {
		const c = connectorOf("c");
		expect(collectStyleTargets(stateOf(["c"], { c }))).toEqual([
			{ object: c, pick: null, selected: true },
		]);
	});

	it("the descendants of a selected group follow it, as unselected targets", () => {
		const g = groupOf("g", ["a", "b"]);
		const a = rectOf("a");
		const b = ellipseOf("b");
		expect(collectStyleTargets(stateOf(["g"], { g, a, b }))).toEqual([
			{ object: g, pick: null, selected: true },
			{ object: a, pick: null, selected: false },
			{ object: b, pick: null, selected: false },
		]);
	});

	it("the pick is handed to the sole selected object", () => {
		const a = rectOf("a");
		const part = partOf("body");
		expect(collectStyleTargets(stateOf(["a"], { a }, part))).toEqual([
			{ object: a, pick: part, selected: true },
		]);
	});

	it("a pick left over from a wider selection reaches nobody", () => {
		const a = rectOf("a");
		const b = rectOf("b");
		const targets = collectStyleTargets(
			stateOf(["a", "b"], { a, b }, partOf("body")),
		);
		expect(targets.map((target) => target.pick)).toEqual([null, null]);
	});

	it("a descendant of a picked-into group is addressed whole", () => {
		const g = groupOf("g", ["a"]);
		const a = rectOf("a");
		const part = partOf("body");
		expect(collectStyleTargets(stateOf(["g"], { g, a }, part))).toEqual([
			{ object: g, pick: part, selected: true },
			{ object: a, pick: null, selected: false },
		]);
	});

	it("reaches the same objects, in the same order, as the first-match readers' walk", () => {
		const objects = {
			g: groupOf("g", ["a", "inner"]),
			a: rectOf("a"),
			inner: groupOf("inner", ["b"]),
			b: ellipseOf("b"),
			c: connectorOf("c"),
			lone: rectOf("lone"),
		};
		const selectedIds = ["g", "lone", "c"];
		expect(
			collectStyleTargets(stateOf(selectedIds, objects)).map(
				(target) => target.object,
			),
		).toEqual(collectSelectionObjects(selectedIds, objects));
	});
});
