import { Canvas } from "@jiscribe/canvas";
import type { CanvasDoc } from "@jiscribe/canvas";
import { createCanvasParser } from "@jiscribe/canvas/doc";
import { useEffect, useState } from "react";

import type { GalleryDiagram } from "./diagrams";

// The gallery ships no plugin, so the default parser (every built-in type) is enough.
const canvasParser = createCanvasParser();

/**
 * Renders one gallery diagram at the framing its entry declares. The `.jis.json` is
 * external input, so it goes through the parser's two-stage validation before reaching
 * Canvas.
 */
export function DiagramView({ diagram }: { diagram: GalleryDiagram }) {
	const [loadedDoc, setLoadedDoc] = useState<CanvasDoc | null>(null);
	const [loadError, setLoadError] = useState<string | null>(null);

	useEffect(() => {
		let isCancelled = false;
		void (async () => {
			const sourceText = await diagram.load();
			if (isCancelled) {
				return;
			}
			const result = canvasParser.parse(sourceText);
			if (result.kind !== "ok") {
				setLoadError(`${diagram.fileName}: ${result.kind}`);
				return;
			}
			setLoadedDoc(result.doc);
		})();
		return () => {
			isCancelled = true;
		};
	}, [diagram]);

	if (loadError) {
		return <p style={{ padding: 16, color: "#f87171" }}>{loadError}</p>;
	}
	if (!loadedDoc) {
		return null;
	}
	return (
		<Canvas
			doc={loadedDoc}
			initialConfig={{ viewport: diagram.camera }}
			autoFocus={false}
		/>
	);
}
