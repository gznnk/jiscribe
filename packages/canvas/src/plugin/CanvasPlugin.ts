import type { AnyObjectTypeDefinition } from "./ObjectTypeDefinition";
import type { ObjectType } from "../schemas/objects/types/ObjectType";

/**
 * Declarative bundle of object-type contributions a host wires into a `<Canvas>`
 * via `CanvasConfig.plugins`
 * (packages/canvas/docs/12-plugin-architecture.md).
 *
 * Structurally assignable to
 * {@link import("../schemas/plugin/CanvasDocPlugin").CanvasDocPlugin}: each
 * `objects` value is an `ObjectTypeDefinition`, which extends `ObjectDocDefinition`,
 * so the same `plugins` array feeds both `<Canvas>` and `createCanvasParser`.
 */
export type CanvasPlugin = {
	id: string;

	/** Object-type contributions. A type already registered (built-in or another plugin) throws at construction time. */
	objects?: Readonly<Partial<Record<ObjectType, AnyObjectTypeDefinition>>>;
};
