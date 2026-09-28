/**
 * One row of the canvas context menu.
 *
 * Both command kinds resolve label / shortcut / enabled from the command
 * registry; they differ only in execution wiring: "command" dispatches via the
 * gesture system (data-part), "callback" invokes callbacks[commandId] directly
 * (definition-only commands such as paste).
 */
export type ContextMenuItem =
	| { type: "command"; commandId: string }
	| { type: "callback"; commandId: string }
	| { type: "separator" };

/**
 * Items a type adds to the context menu when the press landed on one of its
 * objects. Mirrors `menu` / `propertyPanel`: a per-type declaration resolved
 * through a registry, not a branch in core.
 *
 * The items are spliced in verbatim, so a type wanting its block set apart from
 * the built-in one states the `separator` itself.
 */
export type ContextMenuContribution = {
	/** Relative to the built-in block. */
	placement: "before" | "after";
	items: readonly ContextMenuItem[];
};
