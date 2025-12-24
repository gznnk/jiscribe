import { isString } from "@workspace/basic-validators";

import type { ConnectPointData } from "../../../types/data/shapes/ConnectPointData";
import { isDiagramBaseData } from "../../validation/isDiagramBaseData";

/**
 * Type guard to check if data is ConnectPointData.
 *
 * @param data - The data to check
 * @returns True if the data is ConnectPointData
 */
export const isConnectPointData = (data: unknown): data is ConnectPointData => {
	if (!isDiagramBaseData(data)) return false;
	if (data.type !== "ConnectPoint") return false;

	const connectPointData = data as ConnectPointData;
	return isString(connectPointData.name);
};
