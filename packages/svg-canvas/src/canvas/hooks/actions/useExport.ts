import { useCallback, useRef } from "react";

import { DiagramRegistry } from "../../../registry";
import { getSelectedDiagrams } from "../../../utils/core/getSelectedDiagrams";
import { mimeToExtension } from "../../../utils/core/mimeToExtension";
import type { SvgCanvasSubHooksProps } from "../../types/SvgCanvasSubHooksProps";

/**
 * Custom hook to handle export events on the canvas.
 */
export const useExport = (props: SvgCanvasSubHooksProps) => {
	// Create references bypass to avoid function creation in every render.
	const refBusVal = {
		props,
	};
	const refBus = useRef(refBusVal);
	refBus.current = refBusVal;

	return useCallback(() => {
		// Bypass references to avoid function creation in every render.
		const {
			canvasState: { items },
		} = refBus.current.props;

		const selectedItems = getSelectedDiagrams(items);

		for (const item of selectedItems) {
			const exportFunction = DiagramRegistry.getExportFunction(item.type);
			const blob = exportFunction?.(item);
			if (blob) {
				const url = URL.createObjectURL(blob);

				const ext = mimeToExtension(blob.type);

				// Create a link element to download the SVG.
				const link = document.createElement("a");
				link.href = url;
				link.download = `${item.id}.${ext}`;
				document.body.appendChild(link);
				link.click();
				document.body.removeChild(link);
				URL.revokeObjectURL(url); // Clean up the URL object.
			}
		}
	}, []);
};
