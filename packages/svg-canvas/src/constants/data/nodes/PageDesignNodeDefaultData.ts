import type { PageDesignNodeData } from "../../../types/data/nodes/PageDesignNodeData";
import { PageDesignNodeFeatures } from "../../../types/data/nodes/PageDesignNodeData";
import { CreateDefaultData } from "../shapes/CreateDefaultData";

/**
 * Default page design node data template.
 * Generated using Features definition and CreateDefaultData helper.
 */
export const PageDesignNodeDefaultData = CreateDefaultData<PageDesignNodeData>({
	type: "PageDesignNode",
	options: PageDesignNodeFeatures,
	properties: {},
});
