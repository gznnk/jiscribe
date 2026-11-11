import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { ConnectorState } from "../../../states/objects/connector/ConnectorState";
import { textSlotPartSelection } from "../../selection/__tests__/support/textSlotPartSelection";
import { graftConnectorLabelDraft } from "../graftConnectorLabelDraft";

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
	selection: { objectIds: ["connector"], part: null },
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

	it("puts the draft text on a re-edited label, keeping its style and placement", () => {
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
			text: "gone",
			fill: "auto",
			position: 0.3,
			offset: 4,
		});
		expect(readLabel(objects)?.text).toBe("go");
	});

	it("gives a label being created its pending placement, empty or not", () => {
		const objects = { connector: connector() };
		const grafted = graftConnectorLabelDraft(
			labelEdit(objects, "", { position: 0.25, offset: -6 }),
		);
		expect(readLabel(grafted.objects)).toEqual({
			text: "",
			position: 0.25,
			offset: -6,
		});
	});
});
