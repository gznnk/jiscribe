import type { ObjectState } from "../../../../../states/objects/base/ObjectState";
import type { PressTarget } from "../../../../CanvasTypes";
import type { ContextMenuRegistry } from "../ContextMenuRegistry";
import type { ContextMenuItem } from "../ContextMenuTypes";

/**
 * The rows every context menu carries, whatever it was opened over. A type's
 * contribution is spliced before or after this block as a whole, never into it.
 */
export const DEFAULT_CONTEXT_MENU_ITEMS: readonly ContextMenuItem[] = [
	{ type: "command", commandId: "cut" },
	{ type: "command", commandId: "copy" },
	{ type: "command", commandId: "duplicate" },
	{ type: "callback", commandId: "paste" },
	{ type: "command", commandId: "delete" },
	{ type: "separator" },
	{ type: "command", commandId: "selectAll" },
	{ type: "command", commandId: "deselectAll" },
	{ type: "separator" },
	{ type: "command", commandId: "bringToFront" },
	{ type: "command", commandId: "bringForward" },
	{ type: "command", commandId: "sendBackward" },
	{ type: "command", commandId: "sendToBack" },
	{ type: "separator" },
	{ type: "command", commandId: "group" },
	{ type: "command", commandId: "ungroup" },
	{ type: "separator" },
	{ type: "command", commandId: "export" },
];

/**
 * The rows the context menu draws: the built-in block, plus the contribution of
 * the type owning what the press landed on.
 *
 * The owner is found by the target's `id` alone, whatever its `kind`: a press on
 * an object names it, and so does a press on one of the controls drawn on that
 * object (an anchor, a vertex), so the owner's items show there too — a control
 * belongs to an object, and the menu opened over it is the menu for that object.
 * A `kind` whose id names no object — the background (no target at all), a menu,
 * a control of the canvas's own such as the transform frame — leaves the
 * built-in block alone, as does an object of a type contributing nothing.
 *
 * @param target - The press target as recorded, or null for a press on the background
 * @param objects - Every object on the canvas by id, the map the target's id is looked up in
 * @param registry - Per-type contributions, read only for the type that was pressed
 * @returns The built-in block itself when nothing is contributed, so the common case allocates nothing
 */
export const resolveContextMenuItems = (
	target: PressTarget | null,
	objects: Record<string, ObjectState>,
	registry: ContextMenuRegistry,
): readonly ContextMenuItem[] => {
	const pressedType = target ? objects[target.id]?.type : undefined;
	const contribution = pressedType
		? registry.getContribution(pressedType)
		: undefined;
	if (!contribution || contribution.items.length === 0) {
		return DEFAULT_CONTEXT_MENU_ITEMS;
	}
	return contribution.placement === "before"
		? [...contribution.items, ...DEFAULT_CONTEXT_MENU_ITEMS]
		: [...DEFAULT_CONTEXT_MENU_ITEMS, ...contribution.items];
};
