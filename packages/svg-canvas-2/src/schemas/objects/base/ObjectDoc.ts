import type { MetaDoc } from "./MetaDoc";
import type { ObjectType } from "../../types/ObjectType";

export type ObjectDoc = {
	id: string;
	type: ObjectType;
	meta?: MetaDoc;
};
