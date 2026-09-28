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
	id: string;

	/** Object-type contributions. A type already registered (built-in or another plugin) throws at construction time. */
	objects?: Readonly<Partial<Record<ObjectType, AnyObjectTypeDefinition>>>;

	/**
	 * Command contributions, registered after the built-in set in plugin
	 * declaration order. An id already registered (built-in or another plugin)
	 * throws at construction time, so a plugin cannot silently replace a command.
	 *
	 * A binding may be shared with an existing command: the keystroke goes to the
	 * first command whose `canExecute` passes, so the two must not be available at
	 * the same time (see `CommandRegistry.findAllByShortcut`).
	 */
	commands?: readonly Command[];
};
