import { ButtonDefaultData } from "../../../constants/data/elements/ButtonDefaultData";
import type { ButtonData } from "../../../types/data/elements/ButtonData";
import { createStateToDataMapper } from "../../core/createStateToDataMapper";

export const mapButtonStateToData =
	createStateToDataMapper<ButtonData>(ButtonDefaultData);
