import { Canvas } from "@jiscribe/canvas";
import type { CanvasDoc } from "@jiscribe/canvas";
import { createCanvasParser } from "@jiscribe/doc";
import { flowchartPlugin } from "@jiscribe/plugin-flowchart-shapes";
import { generalPlugin } from "@jiscribe/plugin-general-shapes";
import { useEffect, useState } from "react";

import type { GalleryDiagram } from "./diagrams";

// The shapes the gallery drawings use beyond the built-in types: flowchart (stadium,
// hexagon, document, db) and general (actor, cloud). The same array has to reach both the
// parser and Canvas — see the plugins example for what happens when it does not.
const plugins = [flowchartPlugin, generalPlugin];
const canvasParser = createCanvasParser({ plugins });

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
			initialConfig={{ plugins, viewport: diagram.camera }}
			autoFocus={false}
		/>
	);
}
