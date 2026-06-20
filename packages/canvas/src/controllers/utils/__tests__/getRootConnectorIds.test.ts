import { describe, it, expect } from "vitest";

import type { ObjectState } from "../../../states/objects/base/ObjectState";
import { getRootConnectorIds } from "../getRootConnectorIds";

const obj = (type: string) => ({ type }) as ObjectState;

describe("getRootConnectorIds", () => {
	it("空の rootIds → []", () => {
		expect(getRootConnectorIds({}, [])).toEqual([]);
	});

	it("connector のみ → z-order 順で全件返す", () => {
		const objects = {
			c1: obj("connector"),
			c2: obj("connector"),
		};
		expect(getRootConnectorIds(objects, ["c1", "c2"])).toEqual(["c1", "c2"]);
	});

	it("connector 以外のみ → []", () => {
		const objects = {
			r1: obj("rect"),
			e1: obj("ellipse"),
		};
		expect(getRootConnectorIds(objects, ["r1", "e1"])).toEqual([]);
	});

	it("混在 → connector のみ rootIds の順序を維持して返す", () => {
		const objects = {
			r1: obj("rect"),
			c1: obj("connector"),
			e1: obj("ellipse"),
			c2: obj("connector"),
		};
		expect(getRootConnectorIds(objects, ["r1", "c1", "e1", "c2"])).toEqual([
			"c1",
			"c2",
		]);
	});

	it("objects に存在しない ID は除外される", () => {
		expect(getRootConnectorIds({}, ["missing"])).toEqual([]);
	});
});
