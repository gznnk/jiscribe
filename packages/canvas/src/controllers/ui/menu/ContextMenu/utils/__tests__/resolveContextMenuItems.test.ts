import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../../../../states/objects/base/ObjectState";
import { createContextMenuRegistry } from "../../ContextMenuRegistry";
import type { ContextMenuItem } from "../../ContextMenuTypes";
import {
	DEFAULT_CONTEXT_MENU_ITEMS,
	resolveContextMenuItems,
} from "../resolveContextMenuItems";

const TABLE_ROW_ITEMS: readonly ContextMenuItem[] = [
	{ type: "separator" },
	{ type: "command", commandId: "insertRowBelow" },
];

/** One object of `type`, enough for the id lookup the resolver does. */
const objectsOf = (id: string, type: string): Record<string, ObjectState> => ({
	[id]: { id, type } as unknown as ObjectState,
});

/** Just the command ids, so a diff points at the row rather than the object. */
const commandIdsOf = (items: readonly ContextMenuItem[]): string[] =>
	items.flatMap((item) => (item.type === "separator" ? [] : [item.commandId]));

describe("resolveContextMenuItems", () => {
	it("returns the built-in block itself for a press on the background", () => {
		const registry = createContextMenuRegistry();
		registry.register("grid", { placement: "after", items: TABLE_ROW_ITEMS });

		expect(resolveContextMenuItems(null, {}, registry)).toBe(
			DEFAULT_CONTEXT_MENU_ITEMS,
		);
	});

	it("returns the built-in block alone for an object of a type contributing nothing", () => {
		const registry = createContextMenuRegistry();

		expect(
			resolveContextMenuItems(
				{ kind: "object", id: "r1" },
				objectsOf("r1", "rect"),
				registry,
			),
		).toBe(DEFAULT_CONTEXT_MENU_ITEMS);
	});

	it("appends the items of the pressed object's type", () => {
		const registry = createContextMenuRegistry();
		registry.register("grid", { placement: "after", items: TABLE_ROW_ITEMS });

		const items = resolveContextMenuItems(
			{ kind: "object", id: "g1" },
			objectsOf("g1", "grid"),
			registry,
		);

		expect(items.slice(0, DEFAULT_CONTEXT_MENU_ITEMS.length)).toEqual([
			...DEFAULT_CONTEXT_MENU_ITEMS,
		]);
		expect(items.slice(DEFAULT_CONTEXT_MENU_ITEMS.length)).toEqual([
			...TABLE_ROW_ITEMS,
		]);
	});

	it("prepends them when the contribution places itself before", () => {
		const registry = createContextMenuRegistry();
		registry.register("grid", { placement: "before", items: TABLE_ROW_ITEMS });

		const items = resolveContextMenuItems(
			{ kind: "object", id: "g1" },
			objectsOf("g1", "grid"),
			registry,
		);

		expect(items.slice(0, TABLE_ROW_ITEMS.length)).toEqual([
			...TABLE_ROW_ITEMS,
		]);
		expect(items.slice(TABLE_ROW_ITEMS.length)).toEqual([
			...DEFAULT_CONTEXT_MENU_ITEMS,
		]);
	});

	it("leaves the built-in block untouched by a contribution that is empty", () => {
		const registry = createContextMenuRegistry();
		registry.register("grid", { placement: "after", items: [] });

		expect(
			resolveContextMenuItems(
				{ kind: "object", id: "g1" },
				objectsOf("g1", "grid"),
				registry,
			),
		).toBe(DEFAULT_CONTEXT_MENU_ITEMS);
	});

	it("shows the owner's items for a press on a control drawn over its object", () => {
		const registry = createContextMenuRegistry();
		registry.register("grid", { placement: "after", items: TABLE_ROW_ITEMS });

		const items = resolveContextMenuItems(
			{ kind: "control", id: "g1", part: "anchor:rightCenter" },
			objectsOf("g1", "grid"),
			registry,
		);

		expect(commandIdsOf(items)).toContain("insertRowBelow");
	});

	it("returns the built-in block alone for a control whose id names no object", () => {
		const registry = createContextMenuRegistry();
		registry.register("grid", { placement: "after", items: TABLE_ROW_ITEMS });

		expect(
			resolveContextMenuItems(
				{ kind: "control", id: "transform", part: "resize:topLeft" },
				objectsOf("g1", "grid"),
				registry,
			),
		).toBe(DEFAULT_CONTEXT_MENU_ITEMS);
	});

	it("returns the built-in block alone for a press on a menu", () => {
		const registry = createContextMenuRegistry();
		registry.register("grid", { placement: "after", items: TABLE_ROW_ITEMS });

		expect(
			resolveContextMenuItems(
				{ kind: "menu", id: "context-menu", part: "command:copy" },
				objectsOf("g1", "grid"),
				registry,
			),
		).toBe(DEFAULT_CONTEXT_MENU_ITEMS);
	});

	// Pins what the menu carried before a type could add to it: the refactor
	// turned this list into the default, and changed nothing in it.
	it("still names the built-in commands in their original order", () => {
		expect(commandIdsOf(DEFAULT_CONTEXT_MENU_ITEMS)).toEqual([
			"cut",
			"copy",
			"duplicate",
			"paste",
			"delete",
			"selectAll",
			"deselectAll",
			"bringToFront",
			"bringForward",
			"sendBackward",
			"sendToBack",
			"group",
			"ungroup",
			"export",
		]);
	});
});
