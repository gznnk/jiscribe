import { CreateDefaultState } from "./CreateDefaultState";
import { GroupFeatures } from "../../../types/data/shapes/GroupData";
import type { GroupState } from "../../../types/state/shapes/GroupState";
import { GroupDefaultData } from "../../data/shapes/GroupDefaultData";

export const GroupDefaultState = CreateDefaultState<GroupState>({
	type: "Group",
	options: GroupFeatures,
	baseData: GroupDefaultData,
	properties: {},
});
