import { createCanvasRegistries } from "@jiscribe/canvas";
import type { ObjectState } from "@jiscribe/canvas";
import { TEXT_SLOT_PART_KIND } from "@jiscribe/canvas-sdk";
import { describe, expect, it } from "vitest";

import { erPlugin } from "../plugin";
import { erEntityTextSlotIds } from "../schema/erEntityColumnIds";
import type { ErEntityDoc } from "../schema/ErEntityDoc";
import { erEntityToState } from "../state/ErEntityMapper";
import type { ErEntityState } from "../state/ErEntityState";

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

const registries = createCanvasRegistries({ plugins: [erPlugin] });

const textSlotKind = registries.objectPartKind.get(
	"erEntity",
	TEXT_SLOT_PART_KIND,
);

const extendEntity = (state: ErEntityState) => {
	const extension = textSlotKind?.extend?.(state as unknown as ObjectState);
	if (extension === undefined || extension === null) {
		throw new Error("the erEntity's textSlot kind did not extend");
	}
	return {
		object: extension.object as unknown as ErEntityState,
		landingPartId: extension.landingPartId,
	};
};

describe("erEntity textSlot extend", () => {
	it("appends an empty column, its slots listed after the old last one, and lands on its name", () => {
		const state = makeState([
			{ key: "PK", name: "id", type: "bigint" },
			{ name: "email", type: "text" },
		]);

		const { object, landingPartId } = extendEntity(state);

		expect(textSlotKind?.list?.(object as unknown as ObjectState)).toEqual(
			erEntityTextSlotIds(3),
		);
		expect(object.text["col:2:key"].text).toBe("");
		expect(object.text["col:2:name"].text).toBe("");
		expect(object.text["col:2:type"].text).toBe("");
		expect(object.text["col:1:type"].text).toBe("text");
		expect(landingPartId).toBe("col:2:name");
		// Already re-derived: one row taller.
		expect(object.height).toBe(state.height + 25);
	});

	it("appends even after an empty last column", () => {
		const { object, landingPartId } = extendEntity(
			makeState([{ name: "id" }, { name: "" }]),
		);

		expect(textSlotKind?.list?.(object as unknown as ObjectState)).toEqual(
			erEntityTextSlotIds(3),
		);
		expect(landingPartId).toBe("col:2:name");
	});
});
