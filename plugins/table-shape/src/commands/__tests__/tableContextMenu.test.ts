import { describe, expect, it } from "vitest";

import { tablePlugin } from "../../plugin";
import { TABLE_CONTEXT_MENU } from "../tableContextMenu";

/** The command ids the contribution's rows name, in the order they are drawn. */
const contributedCommandIds = TABLE_CONTEXT_MENU.items
	.filter((item) => item.type !== "separator")
	.map((item) => item.commandId);

describe("TABLE_CONTEXT_MENU", () => {
	it("offers the insertions, then the removals, above the built-in block", () => {
		expect(TABLE_CONTEXT_MENU.placement).toBe("before");
		expect(contributedCommandIds).toEqual([
			"table.insertRowAbove",
			"table.insertRowBelow",
			"table.insertColumnLeft",
			"table.insertColumnRight",
			"table.deleteRow",
			"table.deleteColumn",
		]);
	});

	it("names only commands the plugin registers, an unregistered id drawing no row", () => {
		const registered = new Set(
			(tablePlugin.commands ?? []).map((command) => command.id),
		);

		expect(contributedCommandIds.filter((id) => !registered.has(id))).toEqual(
			[],
		);
	});

	it("divides the removals from the insertions and the block from the built-in one", () => {
		const separatorPositions = TABLE_CONTEXT_MENU.items
			.map((item, index) => (item.type === "separator" ? index : -1))
			.filter((index) => index >= 0);

		// After the fourth insertion, and last of all — the divider from the
		// built-in block, which a contribution has to state itself.
		expect(separatorPositions).toEqual([
			4,
			TABLE_CONTEXT_MENU.items.length - 1,
		]);
	});
});
