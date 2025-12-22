import type { FunctionCallHandler, FunctionCallInfo } from "@workspace/llm-client";
import { useCallback } from "react";


export type ResizeCanvasFrameResult = {
	width: number;
	height: number;
};

export const useResizeCanvasFrameWithHandlerTool = (): ((
	handler: (result: ResizeCanvasFrameResult) => void,
) => FunctionCallHandler) => {
	return useCallback((handler: (result: ResizeCanvasFrameResult) => void) => {
		return (functionCall: FunctionCallInfo) => {
			const args = functionCall.arguments as {
				width: number;
				height: number;
			};

			if (typeof args.width === "number" && typeof args.height === "number") {
				const result: ResizeCanvasFrameResult = {
					width: args.width,
					height: args.height,
				};

				handler(result);

				return {
					width: args.width,
					height: args.height,
				};
			}
			return null;
		};
	}, []);
};
