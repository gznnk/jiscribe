import type { ConnectorLabel } from "@jiscribe/doc/model/objects/connector/ConnectorDoc";
import { describe, expect, it } from "vitest";

import type { ConnectorState } from "../../../../states/objects/connector/ConnectorState";
import { CONNECTOR_STYLE_TABLE } from "../../../style/tables/connectorStyleTable";
import { connectorLabelPartSelection } from "../../__tests__/support/connectorLabelPartSelection";
import { vertexPartSelection } from "../../__tests__/support/vertexPartSelection";
import {
	CONNECTOR_LABEL_PART_ID,
	createConnectorLabelPartKindDefinition,
	isConnectorLabelPart,
} from "../connectorLabelPartKind";

const connectorWith = (label: ConnectorLabel | undefined): ConnectorState =>
	({
		id: "c1",
		type: "connector",
		points: [],
		source: { anchor: { kind: "free", point: { x: 0, y: 0 } } },
		target: { anchor: { kind: "free", point: { x: 200, y: 0 } } },
		...(label ? { label } : {}),
	}) as unknown as ConnectorState;

describe("createConnectorLabelPartKindDefinition", () => {
	const labelKind = createConnectorLabelPartKindDefinition();

	it("names the label by its one id while it has text", () => {
		expect(
			labelKind.has(connectorWith({ text: "Yes" }), CONNECTOR_LABEL_PART_ID),
		).toBe(true);
	});

	it("names nothing under any other id", () => {
		for (const partId of ["", "0", "Label", "label:"]) {
			expect(
				labelKind.has(connectorWith({ text: "Yes" }), partId),
				JSON.stringify(partId),
			).toBe(false);
		}
	});

	it("names nothing on a connector with no label, or one emptied and kept for its styles", () => {
		expect(
			labelKind.has(connectorWith(undefined), CONNECTOR_LABEL_PART_ID),
		).toBe(false);
		expect(
			labelKind.has(
				connectorWith({ text: "", fill: "#fff" }),
				CONNECTOR_LABEL_PART_ID,
			),
		).toBe(false);
	});

	it("receives exactly the label rows of the connector's style table", () => {
		const labelStyleIntentKinds = Object.keys(CONNECTOR_STYLE_TABLE).filter(
			(styleIntentKind) => styleIntentKind.startsWith("label."),
		);
		expect(labelStyleIntentKinds.length).toBeGreaterThan(0);
		expect([...(labelKind.styleIntentKinds ?? [])].sort()).toEqual(
			labelStyleIntentKinds.sort(),
		);
		expect(labelKind.styleIntentKinds?.has("stroke")).toBe(false);
	});

	it("deletes a label carrying a style by emptying its text and dropping its placement", () => {
		const deletion = labelKind.delete?.(
			connectorWith({
				text: "Yes",
				position: 0.25,
				offset: 12,
				fill: "#dc2626",
				fontWeight: "bold",
			}),
			[CONNECTOR_LABEL_PART_ID],
		);
		expect(deletion?.object.label).toEqual({
			text: "",
			fill: "#dc2626",
			fontWeight: "bold",
		});
		expect(deletion?.connectPointRemap).toBeUndefined();
	});

	it("deletes a label carrying nothing but text and placement outright", () => {
		const deletion = labelKind.delete?.(
			connectorWith({ text: "Yes", position: 0.25, offset: 12 }),
			[CONNECTOR_LABEL_PART_ID],
		);
		expect(deletion?.object).not.toHaveProperty("label");
		expect(deletion?.object.id).toBe("c1");
	});
});

describe("isConnectorLabelPart", () => {
	it("is true for a pick of the label kind alone", () => {
		expect(isConnectorLabelPart(connectorLabelPartSelection())).toBe(true);
		expect(isConnectorLabelPart(vertexPartSelection(0))).toBe(false);
		expect(isConnectorLabelPart(null)).toBe(false);
	});
});
