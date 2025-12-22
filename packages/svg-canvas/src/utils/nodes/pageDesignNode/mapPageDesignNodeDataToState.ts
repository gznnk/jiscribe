import { PageDesignNodeDefaultState } from "../../../constants/state/nodes/PageDesignNodeDefaultState";
import type { DiagramData } from "../../../types/data/core/DiagramData";
import type { PageDesignNodeData } from "../../../types/data/nodes/PageDesignNodeData";
import type { Diagram } from "../../../types/state/core/Diagram";
import type { PageDesignNodeState } from "../../../types/state/nodes/PageDesignNodeState";
import { createDataToStateMapper } from "../../core/createDataToStateMapper";

export const mapPageDesignNodeDataToState =
	createDataToStateMapper<PageDesignNodeState>(PageDesignNodeDefaultState);

export const pageDesignNodeDataToState = (data: DiagramData): Diagram =>
	mapPageDesignNodeDataToState(data as PageDesignNodeData);
