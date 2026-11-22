import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { ConnectorState } from "../../../states/objects/connector/ConnectorState";
import { connectorLabelPartSelection } from "../../selection/__tests__/support/connectorLabelPartSelection";
import { textSlotPartSelection } from "../../selection/__tests__/support/textSlotPartSelection";
import {
	graftConnectorLabelDraft,
	resolveConnectorLabelDraft,
} from "../graftConnectorLabelDraft";

type GraftInput = Parameters<typeof graftConnectorLabelDraft>[0];

const connector = (label?: ConnectorState["label"]): ObjectState =>
	({
		id: "connector",
		type: "connector",
		points: [],
		routing: "straight",
		source: { anchor: { kind: "free", point: { x: 0, y: 0 } } },
		target: { anchor: { kind: "free", point: { x: 100, y: 0 } } },
		label,
	}) as unknown as ObjectState;

const shape = {
	id: "shape",
	type: "rect",
	text: { body: { text: "a" } },
} as unknown as ObjectState;

const labelEdit = (
	objects: Record<string, ObjectState>,
	text: string,
	placement?: { position: number; offset: number },
): GraftInput => ({
	objects,
	selection: { objectIds: ["connector"], part: connectorLabelPartSelection() },
	mode: {
		kind: "textEdit",
		draft: { kind: "connectorLabel", text, placement },
	},
});

const readLabel = (objects: Record<string, ObjectState>) =>
	(objects.connector as ConnectorState).label;

describe("graftConnectorLabelDraft", () => {
	it("hands the objects back as they are, and no owner, with no label edit open", () => {
		const objects = { connector: connector({ text: "go" }), shape };
		expect(
			graftConnectorLabelDraft({
				objects,
				selection: { objectIds: [], part: null },
				mode: { kind: "normal" },
			}),
		).toEqual({ objects, labelEditOwnerId: null });
		const shapeEdit = graftConnectorLabelDraft({
			objects,
			selection: { objectIds: ["shape"], part: textSlotPartSelection("body") },
			mode: { kind: "textEdit", draft: { kind: "shape", text: "ab" } },
		});
		expect(shapeEdit.objects).toBe(objects);
		expect(shapeEdit.labelEditOwnerId).toBeNull();
	});

	it("keeps a re-edited label as committed, the draft text left out", () => {
		const objects = {
			connector: connector({
				text: "go",
				fill: "auto",
				position: 0.3,
				offset: 4,
			}),
		};
		const grafted = graftConnectorLabelDraft(labelEdit(objects, "gone"));
		expect(grafted.labelEditOwnerId).toBe("connector");
		expect(readLabel(grafted.objects)).toEqual({
			text: "go",
			fill: "auto",
			position: 0.3,
			offset: 4,
		});
	});

	it("gives a label being created an empty label at its pending placement, whatever is typed", () => {
		const objects = { connector: connector() };
		const grafted = graftConnectorLabelDraft(
			labelEdit(objects, "typed", { position: 0.25, offset: -6 }),
		);
		expect(readLabel(grafted.objects)).toEqual({
			text: "",
			position: 0.25,
			offset: -6,
		});
	});
});

describe("resolveConnectorLabelDraft", () => {
	it("draws a re-edited label with the draft text, keeping its style and placement", () => {
		const labelOwner = connector({
			text: "go",
			fill: "#ff0000",
			strokeWidth: 2,
			position: 0.3,
			offset: 4,
		}) as ConnectorState;
		expect(resolveConnectorLabelDraft(labelOwner, "gone", undefined)).toEqual({
			text: "gone",
			fill: "#ff0000",
			strokeWidth: 2,
			position: 0.3,
			offset: 4,
		});
	});

	it("puts a label being created at its pending placement, over a deleted label's leftovers", () => {
		const labelOwner = connector({
			text: "",
			fontSize: 20,
			position: 0.9,
			offset: 8,
		}) as ConnectorState;
		expect(
			resolveConnectorLabelDraft(labelOwner, "", {
				position: 0.25,
				offset: -6,
			}),
		).toEqual({ text: "", fontSize: 20, position: 0.25, offset: -6 });
	});

	it("gives a connector with no label one holding the draft text alone", () => {
		expect(
			resolveConnectorLabelDraft(connector() as ConnectorState, "a", undefined),
		).toEqual({ text: "a", position: undefined, offset: undefined });
	});
});
