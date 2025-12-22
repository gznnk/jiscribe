import { NodeHeaderDefaultData } from "../../../constants/data/elements/NodeHeaderDefaultData";
import type { NodeHeaderData } from "../../../types/data/elements/NodeHeaderData";
import { createStateToDataMapper } from "../../core/createStateToDataMapper";

export const mapNodeHeaderStateToData = createStateToDataMapper<NodeHeaderData>(
	NodeHeaderDefaultData,
);
