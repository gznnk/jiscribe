import type { MetaState } from "./MetaState";
import type { ObjectType } from "../../../schemas/objects/types/ObjectType";

export type ObjectState = {
	id: string;
	type: ObjectType;
	meta?: MetaState;
};
