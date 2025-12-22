import type { FunctionCallHandler, FunctionCallInfo } from "@workspace/llm-client";
import { useCallback } from "react";

import type { Diagram } from "../../types/state/core/Diagram";
import { createRectangleState } from "../../utils/shapes/rectangle/createRectangleState";

export const useAddMarkdownShapeWithHandlerTool = (): ((
	handler: (diagrams: Diagram) => void,
) => FunctionCallHandler) => {
	return useCallback((handler: (diagrams: Diagram) => void) => {
		return (functionCall: FunctionCallInfo) => {
			const args = functionCall.arguments as {
				x: number;
				y: number;
				width?: number;
				height?: number;
				text?: string;
				fill?: string;
				stroke?: string;
				strokeWidth?: number;
				name?: string;
				description?: string;
			};

			if (typeof args.x === "number" && typeof args.y === "number") {
				// Default dimensions for markdown shape
				const width = args.width || 300;
				const height = args.height || 200;

				// Create markdown shape with styled appearance
				const data = createRectangleState({
					x: args.x,
					y: args.y,
					width,
					height,
					cornerRadius: 8, // Rounded corners for a modern look
					fill: args.fill || "#fef9e7", // Light cream/yellow background
					stroke: args.stroke || "#f39c12", // Orange border
					strokeWidth: args.strokeWidth ?? 2,
					text: args.text || "",
					textType: "markdown", // Use markdown type for rich text editing
					textAlign: "left",
					verticalAlign: "start",
					fontColor: "#2c3e50", // Dark gray text
					fontSize: 14,
					fontFamily: "Noto Sans JP",
					fontWeight: "normal",
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
