import { InputDefaultData } from "../../../constants/data/elements/InputDefaultData";
import type { InputData } from "../../../types/data/elements/InputData";
import { createStateToDataMapper } from "../../core/createStateToDataMapper";

export const inputStateToData =
	createStateToDataMapper<InputData>(InputDefaultData);
