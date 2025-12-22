import { CreateDefaultData } from "./CreateDefaultData";
import type { GroupData } from "../../../types/data/shapes/GroupData";
import { GroupFeatures } from "../../../types/data/shapes/GroupData";

/**
 * Default group data template.
 * Generated using Features definition and CreateDefaultData helper.
 */
export const GroupDefaultData = CreateDefaultData<GroupData>({
	type: "Group",
	options: GroupFeatures,
	properties: {},
});
