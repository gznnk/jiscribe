import type { FunctionCallHandler, FunctionCallInfo } from "@workspace/llm-client";
import { useCallback } from "react";

import type { Diagram } from "../../types/state/core/Diagram";
import { createRectangleState } from "../../utils/shapes/rectangle/createRectangleState";

export const useAddRectangleShapeWithHandlerTool = (): ((
	handler: (diagrams: Diagram) => void,
) => FunctionCallHandler) => {
	return useCallback((handler: (diagrams: Diagram) => void) => {
		return (functionCall: FunctionCallInfo) => {
			const args = functionCall.arguments as {
				x: number;
				y: number;
				width: number;
				height: number;
				fill: string;
				stroke?: string;
				strokeWidth?: number;
				rx?: number;
				text?: string;
				textAlign?: "left" | "center" | "right";
				verticalAlign?: "start" | "center" | "end";
				fontColor?: string;
				fontSize?: number;
				fontFamily?: string;
				fontWeight?: string;
				name?: string;
				description?: string;
			};

			if (
				typeof args.x === "number" &&
				typeof args.y === "number" &&
				typeof args.width === "number" &&
				typeof args.height === "number" &&
				typeof args.fill === "string"
			) {
				const data = createRectangleState({
					x: args.x,
					y: args.y,
					width: args.width,
					height: args.height,
					cornerRadius: args.rx || 0,
					fill: args.fill,
					stroke: args.stroke || "transparent",
					strokeWidth: args.strokeWidth ?? 1,
					text: args.text || "",
					textType: "textarea",
					textAlign: args.textAlign || "center",
					verticalAlign: args.verticalAlign || "center",
					fontColor: args.fontColor || "black",
					fontSize: args.fontSize || 16,
					fontFamily: args.fontFamily || "Noto Sans JP",
					fontWeight: args.fontWeight || "normal",
					connectEnabled: false,
					name: args.name,
					description: args.description,
				});

				handler(data);
				return {
					id: data.id,
					type: "Rectangle",
					width: data.width,
					height: data.height,
					x: data.x,
					y: data.y,
				};
			}
			return null;
		};
	}, []);
};
