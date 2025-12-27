import type {
	FunctionCallHandler,
	FunctionCallInfo,
} from "@workspace/llm-client";
import { useCallback } from "react";

import type { Diagram } from "../../types/state/core/Diagram";
import { createEllipseState } from "../../utils/shapes/ellipse/createEllipseState";

export const useAddCircleShapeWithHandlerTool = (): ((
	handler: (diagram: Diagram) => void,
) => FunctionCallHandler) => {
	return useCallback((handler: (diagram: Diagram) => void) => {
		return (functionCall: FunctionCallInfo) => {
			const args = functionCall.arguments as {
				cx: number;
				cy: number;
				r: number;
				fill: string;
				stroke?: string;
				strokeWidth?: number;
				name?: string;
				description?: string;
			};

			if (
				typeof args.cx === "number" &&
				typeof args.cy === "number" &&
				typeof args.r === "number" &&
				typeof args.fill === "string"
			) {
				const data = createEllipseState({
					x: args.cx,
					y: args.cy,
					width: args.r * 2,
					height: args.r * 2,
					fill: args.fill,
					stroke: args.stroke || "transparent",
					strokeWidth: args.strokeWidth ?? 1,
					text: "",
					textType: "textarea",
					connectEnabled: false,
					name: args.name,
					description: args.description,
				});

				handler(data);
				return {
					id: data.id,
					type: "Ellipse",
					// TODO: 要精査
					// width: data.width,
					// height: data.height,
					cx: args.cx,
					cy: args.cy,
					r: args.r,
				};
			}
			return null;
		};
	}, []);
};
