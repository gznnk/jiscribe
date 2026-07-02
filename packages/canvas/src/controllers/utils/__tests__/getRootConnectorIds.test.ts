import { describe, it, expect } from "vitest";

import type { ObjectState } from "../../../states/objects/base/ObjectState";
import { getRootConnectorIds } from "../getRootConnectorIds";

const obj = (type: string) => ({ type }) as ObjectState;

describe("getRootConnectorIds", () => {
	it("empty rootIds -> []", () => {
		expect(getRootConnectorIds({}, [])).toEqual([]);
	});

	it("connectors only -> returns all in z-order", () => {
		const objects = {
			c1: obj("connector"),
			c2: obj("connector"),
		};
		expect(getRootConnectorIds(objects, ["c1", "c2"])).toEqual(["c1", "c2"]);
	});

	it("non-connectors only -> []", () => {
		const objects = {
			r1: obj("rect"),
			e1: obj("ellipse"),
		};
		expect(getRootConnectorIds(objects, ["r1", "e1"])).toEqual([]);
	});

	it("mixed -> returns only connectors, preserving rootIds order", () => {
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

	it("IDs not present in objects are excluded", () => {
		expect(getRootConnectorIds({}, ["missing"])).toEqual([]);
	});
});
