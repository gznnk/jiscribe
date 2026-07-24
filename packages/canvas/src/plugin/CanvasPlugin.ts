import type { AnyObjectTypeDefinition } from "./ObjectTypeDefinition";
import type { ObjectParserExtension } from "../schemas/canvas/validators";
import type { ObjectType } from "../schemas/objects/types/ObjectType";

/**
 * Declarative bundle of object-type and parse-time contributions a host wires
 * into a `<Canvas>` via `CanvasConfig.plugins`
 * (docs/05_extensibility/plugin-architecture-requirements.md §3).
 */
export type CanvasPlugin = {
	id: string;

	/** Object-type contributions. A type already registered (built-in or another plugin) throws at construction time. */
	objects?: Readonly<Partial<Record<ObjectType, AnyObjectTypeDefinition>>>;

	/** Parse-time extensions; read by `createCanvasParser({ plugins })`. */
	parser?: readonly ObjectParserExtension[];
};
