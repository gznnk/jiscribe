import { Canvas, parseCanvasText } from "@jiscribe/canvas";
import type { CanvasDoc } from "@jiscribe/canvas";
import { useCallback, useEffect, useMemo, useState } from "react";

// The canonical sample .jis.json files live here (apps/canvas-examples/diagrams/).
// The distribution side syncs from here.
const diagramLoaders = import.meta.glob<string>("../../diagrams/*.jis.json", {
	query: "?raw",
	import: "default",
});

const diagramEntries = Object.entries(diagramLoaders)
	.map(([path, load]) => ({
		name: path
			.split("/")
			.at(-1)!
			.replace(/\.jis\.json$/, ""),
		load,
	}))
	.sort((a, b) => a.name.localeCompare(b.name));

/**
 * Gallery that loads and displays real .jis.json files. They are external input, so they
 * go through the two-stage validation of parseCanvasText before reaching Canvas.
 */
export function GalleryExample() {
	const [selectedName, setSelectedName] = useState(diagramEntries[0]?.name);
	const [loadedDoc, setLoadedDoc] = useState<CanvasDoc | null>(null);
	const [loadError, setLoadError] = useState<string | null>(null);

	const selectedEntry = useMemo(
		() => diagramEntries.find((entry) => entry.name === selectedName),
		[selectedName],
	);

	const loadSelected = useCallback(async () => {
		if (!selectedEntry) {
			return;
		}
		setLoadedDoc(null);
		setLoadError(null);
		const sourceText = await selectedEntry.load();
		const result = parseCanvasText(sourceText);
		if (result.kind !== "ok") {
			setLoadError(`${selectedEntry.name}: ${result.kind}`);
			return;
		}
		setLoadedDoc(result.doc);
	}, [selectedEntry]);

	useEffect(() => {
		void loadSelected();
	}, [loadSelected]);

	return (
		<div style={{ display: "flex", width: "100%", height: "100%" }}>
			<div
				style={{
					flex: "0 0 220px",
					overflowY: "auto",
					padding: 12,
					boxSizing: "border-box",
					borderRight: "1px solid #333",
					background: "#1e1e22",
					color: "#d4d4d8",
					fontSize: "0.8rem",
				}}
			>
				{diagramEntries.map((entry) => (
					<button
						key={entry.name}
						type="button"
						onClick={() => setSelectedName(entry.name)}
						style={{
							display: "block",
							width: "100%",
							textAlign: "left",
							padding: "6px 8px",
							marginBottom: 2,
							border: "none",
							borderRadius: 4,
							cursor: "pointer",
							background:
								entry.name === selectedName
									? "rgba(128, 128, 128, 0.3)"
									: "transparent",
							color: "inherit",
						}}
					>
						{entry.name}
					</button>
				))}
			</div>
			<div style={{ flex: 1, minWidth: 0 }}>
				{loadError ? (
					<p style={{ padding: 16, color: "#f87171" }}>{loadError}</p>
				) : loadedDoc ? (
					// key remounts on diagram change, so no selection or history carries over
					<Canvas key={selectedName} doc={loadedDoc} autoFocus={false} />
				) : null}
			</div>
		</div>
	);
}
