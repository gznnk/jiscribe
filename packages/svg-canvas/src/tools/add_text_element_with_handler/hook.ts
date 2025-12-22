import type { FunctionCallHandler, FunctionCallInfo } from "@workspace/llm-client";
import { useCallback } from "react";

import type { Diagram } from "../../types/state/core/Diagram";
import { createRectangleState } from "../../utils/shapes/rectangle/createRectangleState";

export const useAddTextElementWithHandlerTool = (): ((
	handler: (diagram: Diagram) => void,
) => FunctionCallHandler) => {
	return useCallback((handler: (diagram: Diagram) => void) => {
		return (functionCall: FunctionCallInfo) => {
			const args = functionCall.arguments as {
				x: number;
				y: number;
				width: number;
				height: number;
				text: string;
				fontSize: number;
				fill: string;
				fontFamily?: string;
				textAlign?: "left" | "center" | "right";
				verticalAlign?: "start" | "center" | "end";
				name?: string;
				description?: string;
			};

			if (
				typeof args.x === "number" &&
				typeof args.y === "number" &&
				typeof args.width === "number" &&
				typeof args.height === "number" &&
				typeof args.text === "string" &&
				typeof args.fontSize === "number" &&
				typeof args.fill === "string"
			) {
				const data = createRectangleState({
					x: args.x,
					y: args.y,
					width: args.width,
					height: args.height,
					cornerRadius: 0,
					fill: "transparent", // Transparent background for text-only elements
					stroke: "transparent",
					strokeWidth: 0,
					text: args.text,
					textType: "textarea",
					fontSize: args.fontSize,
					fontFamily: args.fontFamily || "Noto Sans JP",
					fontColor: args.fill,
					textAlign: args.textAlign || "center",
					verticalAlign: args.verticalAlign || "center",
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
					text: args.text,
					x: data.x,
					y: data.y,
				};
			}
			return null;
		};
	}, []);
};
