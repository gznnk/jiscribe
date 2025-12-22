import { PageDesignNodeFeatures } from "../../../types/data/nodes/PageDesignNodeData";
import type { PageDesignNodeState } from "../../../types/state/nodes/PageDesignNodeState";
import { PageDesignNodeDefaultData } from "../../data/nodes/PageDesignNodeDefaultData";
import { CreateDefaultState } from "../shapes/CreateDefaultState";

/**
 * Default page design node state template.
 */
export const PageDesignNodeDefaultState =
	CreateDefaultState<PageDesignNodeState>({
		type: "PageDesignNode",
		options: PageDesignNodeFeatures,
		baseData: PageDesignNodeDefaultData,
		properties: {},
	});
