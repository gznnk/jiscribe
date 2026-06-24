import { describe, expect, it } from "vitest";

import type { ConnectorState } from "../../../../../../states/objects/connections/connector/ConnectorState";
import type { GroupState } from "../../../../../../states/objects/primitives/group/GroupState";
import {
	moveByDelta,
	rotateByGroup,
	transformByGroup,
} from "../ConnectorController";

// コネクターのジオメトリは端点から描画時に解決されるため、behavior はすべて no-op。
// この不変条件（state をそのまま返す）が崩れていないことを担保する。
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

describe("ConnectorController behavior は全て no-op", () => {
	it("moveByDelta は state をそのまま返す", () => {
		const state = makeConnector();
		expect(moveByDelta(state, { x: 10, y: 10 })).toBe(state);
	});

	it("transformByGroup は state をそのまま返す", () => {
		const state = makeConnector();
		expect(transformByGroup(state, group, group)).toBe(state);
	});

	it("rotateByGroup は state をそのまま返す", () => {
		const state = makeConnector();
		expect(rotateByGroup(state, group, 90)).toBe(state);
	});
});
