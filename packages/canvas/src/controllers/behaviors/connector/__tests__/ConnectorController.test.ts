import { describe, expect, it } from "vitest";

import type { ConnectorState } from "../../../../states/objects/connector/ConnectorState";
import type { GroupState } from "../../../../states/objects/primitives/group/GroupState";
import {
	moveByDelta,
	rotateByGroup,
	transformByGroup,
} from "../ConnectorController";

// A connector's geometry is resolved from its endpoints at render time, so all behaviors are no-ops.
// This guarantees that the invariant (returning the state as-is) has not been broken.
const makeConnector = (): ConnectorState =>
	({
		id: "connector-1",
		type: "connector",
		source: { id: "rect-1" },
		target: { id: "rect-2" },
	}) as unknown as ConnectorState;

const group = {
	id: "group-1",
	type: "group",
	cx: 0,
	cy: 0,
	width: 100,
	height: 100,
	rotation: 0,
	scaleX: 1,
	scaleY: 1,
	childIds: [],
} as unknown as GroupState;

describe("ConnectorController behaviors are all no-ops", () => {
	it("moveByDelta returns the state as-is", () => {
		const state = makeConnector();
		expect(moveByDelta(state, { x: 10, y: 10 })).toBe(state);
	});

	it("transformByGroup returns the state as-is", () => {
		const state = makeConnector();
		expect(transformByGroup(state, group, group)).toBe(state);
	});

	it("rotateByGroup returns the state as-is", () => {
		const state = makeConnector();
		expect(rotateByGroup(state, group, 90)).toBe(state);
	});
});
