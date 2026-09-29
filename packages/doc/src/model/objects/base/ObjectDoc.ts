import type { MetaDoc } from "./MetaDoc";
import type { ObjectType } from "../types/ObjectType";
import { exhaustiveKeysOf } from "../utils/exhaustiveKeys";

export type ObjectDoc = {
	id: string;
	type: ObjectType;
	meta?: MetaDoc;
};

/**
 * Field names every object carries, whatever its type. Built from the type the
 * same way the style-group constants are, so a field added to ObjectDoc reaches
 * every enumeration of it (the parser's accepted-name set, built in
 * ObjectDocValidatorRegistry) or fails to compile.
 */
export const OBJECT_COMMON_KEYS = exhaustiveKeysOf<ObjectDoc>()([
	"id",
	"type",
	"meta",
] as const);
