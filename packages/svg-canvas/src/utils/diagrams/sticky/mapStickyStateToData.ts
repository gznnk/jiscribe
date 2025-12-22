import { StickyDefaultData } from "../../../constants/data/diagrams/StickyDefaultData";
import type { DiagramData } from "../../../types/data/core/DiagramData";
import type { StickyData } from "../../../types/data/diagrams/StickyData";
import type { Diagram } from "../../../types/state/core/Diagram";
import type { StickyState } from "../../../types/state/diagrams/StickyState";
import { createStateToDataMapper } from "../../core/createStateToDataMapper";

export const mapStickyStateToData =
	createStateToDataMapper<StickyData>(StickyDefaultData);

export const stickyStateToData = (state: Diagram): DiagramData =>
	mapStickyStateToData(state as StickyState);