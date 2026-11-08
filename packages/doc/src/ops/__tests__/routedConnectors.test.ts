import { describe, expect, it } from "vitest";

import type { ConnectorDoc } from "../../model/objects/connector/ConnectorDoc";
import { writeRoutedConnector } from "../utils/routedConnectors";

const makeConnector = (): ConnectorDoc =>
	({
		id: "c1",
		type: "connector",
		source: { owner: { id: "old-source" }, anchor: { kind: "center" } },
		target: { owner: { id: "old-target" }, anchor: { kind: "center" } },
		points: [{ x: 1, y: 2 }],
		routing: "straight",
		label: { text: "yes", position: 0.25, offset: 7 },
	}) as unknown as ConnectorDoc;

const source = {
	owner: { id: "a" },
	anchor: { kind: "edge", side: "right", t: 0.5 },
} as unknown as ConnectorDoc["source"];
const target = {
	owner: { id: "b" },
	anchor: { kind: "edge", side: "left", t: 0.5 },
} as unknown as ConnectorDoc["target"];

describe("writeRoutedConnector", () => {
	it("writes the ends and corners and drops routing", () => {
		const connector = makeConnector();
		writeRoutedConnector(
			connector,
			source,
			target,
			[{ x: 9, y: 9 }],
			undefined,
		);
		expect(connector.source).toBe(source);
		expect(connector.target).toBe(target);
		expect(connector.points).toEqual([{ x: 9, y: 9 }]);
		expect(connector).not.toHaveProperty("routing");
	});

	it("moves the label to the placement, its offset 0 when none is given", () => {
		const connector = makeConnector();
		writeRoutedConnector(connector, source, target, [], { labelPosition: 0.8 });
		expect(connector.label).toMatchObject({ position: 0.8, offset: 0 });
	});

	it("leaves the label where it is without a placement or a position in it", () => {
		const withoutPlacement = makeConnector();
		writeRoutedConnector(withoutPlacement, source, target, [], undefined);
		expect(withoutPlacement.label).toMatchObject({ position: 0.25, offset: 7 });

		const withoutPosition = makeConnector();
		writeRoutedConnector(withoutPosition, source, target, [], {
			labelOffset: 3,
		});
		expect(withoutPosition.label).toMatchObject({ position: 0.25, offset: 7 });
	});
});
