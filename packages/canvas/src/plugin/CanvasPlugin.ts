import type { ObjectType } from "@jiscribe/doc/model/objects/types/ObjectType";

import type { AnyObjectTypeDefinition } from "./ObjectTypeDefinition";
import type { Command } from "../controllers/commands/CommandTypes";

/**
 * Declarative bundle of object-type and command contributions a host wires into
 * a `<Canvas>` via `CanvasConfig.plugins`
 * (packages/canvas/docs/12-plugin-architecture.md).
 *
 * Structurally assignable to
 * {@link import("@jiscribe/doc/plugin/CanvasDocPlugin").CanvasDocPlugin}: each
 * `objects` value is an `ObjectTypeDefinition`, which extends `ObjectDocDefinition`,
 * so the same `plugins` array feeds both `<Canvas>` and `createCanvasParser`.
 */
export type CanvasPlugin = {
	/**
	 * Stable identifier of the plugin, naming it in the error a conflicting
	 * object-type contribution raises (`createCanvasRegistries`). A command
	 * conflict is raised by `CommandRegistry` before the plugin is in hand, so it
	 * names the id alone.
	 */
	id: string;

	/** Object-type contributions. A type already registered (built-in or another plugin) throws at construction time. */
	objects?: Readonly<Partial<Record<ObjectType, AnyObjectTypeDefinition>>>;

	/**
	 * Command contributions, registered after the built-in set in plugin
	 * declaration order. An id already registered (built-in or another plugin)
	 * throws at construction time, so a plugin cannot silently replace a command.
	 *
	 * A binding may be shared with an existing command, and a contributed command
	 * is offered the keystroke before any built-in one: it claims the key whenever
	 * its `canExecute` is true, taking it from the built-in (a table's bare arrows
	 * move the cell selection instead of nudging the table). Keep `canExecute`
	 * narrow to the context the plugin owns, or the built-in stops answering
	 * elsewhere too. Among contributed commands the first in declaration order
	 * whose `canExecute` passes wins, so two of them must not be available at the
	 * same time (see `CommandRegistry.findAllByShortcut`).
	 */
	commands?: readonly Command[];
};
