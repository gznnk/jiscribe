import { createCanvasRegistries } from "@jiscribe/canvas";
import { TEXT_SLOT_PART_KIND } from "@jiscribe/canvas-sdk";
import type {
	CanvasControllerState,
	ICanvasRegistries,
} from "@jiscribe/canvas-sdk";
import { describe, expect, it } from "vitest";

import { erPlugin } from "../../plugin";
import type { ErEntityDoc } from "../../schema/ErEntityDoc";
import { erEntityToState } from "../../state/ErEntityMapper";
import type { ErEntityState } from "../../state/ErEntityState";
import { ER_ENTITY_LANE_COMMANDS } from "../erEntityLaneCommands";

const makeState = (columns: ErEntityDoc["columns"]): ErEntityState =>
	erEntityToState({
		id: "e-1",
		type: "erEntity",
		x: 0,
		y: 0,
		nameWidth: 96,
		typeWidth: 100,
		name: "users",
		columns,
	} as ErEntityDoc);

const ENTITY = makeState([
	{ key: "PK", name: "id", type: "bigint" },
	{ name: "email", type: "text" },
]);

type PartSelection = CanvasControllerState["selection"]["part"];

/** A pick of one range of `kind` on the entity. */
const pickOf = (
	kind: string,
	anchorId: string,
	focusId: string = anchorId,
): PartSelection => ({ kind, ranges: [{ anchorId, focusId }] });

/** A canvas holding the one entity, selected, with `part` standing on it. */
const canvasWith = (
	part: PartSelection,
	entity: ErEntityState = ENTITY,
): CanvasControllerState =>
	({
		objects: { [entity.id]: entity },
		selection: { objectIds: [entity.id], part },
		textEditState: null,
		objectMenuOpenId: null,
		lastDuplicate: null,
		commitVersion: 7,
	}) as unknown as CanvasControllerState;

const registries = createCanvasRegistries({
	plugins: [erPlugin],
}) as unknown as ICanvasRegistries;

const commandById = (id: string) => {
	const command = ER_ENTITY_LANE_COMMANDS.find((entry) => entry.id === id);
	if (command === undefined) {
		throw new Error(`no command ${id}`);
	}
	return command;
};

describe("erEntity lane commands", () => {
	it("claims Enter only over a lane pick of an entity with rows", () => {
		const editLane = commandById("erEntity.editLane");
		expect(
			editLane.canExecute(
				canvasWith(pickOf("erEntityLane", "type")),
				registries,
			),
		).toBe(true);
		expect(editLane.canExecute(canvasWith(null), registries)).toBe(false);
		expect(
			editLane.canExecute(
				canvasWith(pickOf(TEXT_SLOT_PART_KIND, "col:0:type")),
				registries,
			),
		).toBe(false);
		expect(
			editLane.canExecute(
				canvasWith(pickOf("erEntityLane", "type"), makeState([])),
				registries,
			),
		).toBe(false);
	});

	it("opens the active lane's slot in the first row on Enter", () => {
		const opened = commandById("erEntity.editLane").execute(
			canvasWith(pickOf("erEntityLane", "key", "type")),
			registries,
		);
		expect(opened.selection.part).toEqual(
			pickOf(TEXT_SLOT_PART_KIND, "col:0:type"),
		);
		expect(opened.textEditState).toEqual({ kind: "shape", text: "bigint" });
	});

	it("leaves Delete over a lane pick to the built-in one, which empties the lane", () => {
		const execute = registries.command.get("delete")?.execute;
		const result = execute!(
			canvasWith(pickOf("erEntityLane", "name")),
			registries,
		);
		const entity = result.objects[ENTITY.id] as ErEntityState;
		expect(entity.text["col:0:name"].text).toBe("");
		expect(entity.text["col:1:name"].text).toBe("");
		expect(entity.text["col:0:type"].text).toBe("bigint");
		expect("col:1:key" in entity.text).toBe(true);
	});
});
