import type { FunctionCallHandler, FunctionCallInfo } from "@workspace/llm-client";
import { useCallback } from "react";

import { newId } from "../../utils/shapes/common/newId";

type GroupShapesResult = {
	shapeIds: string[];
	groupId: string;
	name?: string;
	description?: string;
};

export const useGroupShapesWithHandlerTool = (): ((
	handler: (result: GroupShapesResult) => void,
) => FunctionCallHandler) => {
	return useCallback((handler: (result: GroupShapesResult) => void) => {
		return (functionCall: FunctionCallInfo) => {
			const args = functionCall.arguments as {
				shapeIds: string[];
				name?: string;
				description?: string;
			};

			if (
				Array.isArray(args.shapeIds) &&
				args.shapeIds.length >= 2 &&
				args.shapeIds.every((id) => typeof id === "string")
			) {
				const groupId = newId();
				const result: GroupShapesResult = {
					shapeIds: args.shapeIds,
					groupId,
					name: args.name,
					description: args.description,
				};

				handler(result);

				return {
					shapeIds: args.shapeIds,
					groupId,
					success: true,
				};
			}

			return {
				error:
					"Invalid arguments. shapeIds must be an array of at least 2 string IDs.",
			};
		};
	}, []);
};
