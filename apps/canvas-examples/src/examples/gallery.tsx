import { Canvas, parseCanvasText } from "@jiscribe/canvas";
import type { CanvasDoc } from "@jiscribe/canvas";
import { useCallback, useEffect, useMemo, useState } from "react";

// 作例 .jis.json の正本はここ（apps/canvas-examples/diagrams/）。配信側は
// ここから同期する。
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
 * 実物 .jis.json を読み込んで表示するギャラリー。外部入力なので
 * parseCanvasText の 2 段階バリデーションを通してから Canvas へ渡す。
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
					// 図の切り替えは key でリマウントし、前の図の選択・履歴を持ち越さない
					<Canvas key={selectedName} doc={loadedDoc} autoFocus={false} />
				) : null}
			</div>
		</div>
	);
}
