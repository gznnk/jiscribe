import { useEffect, useState } from "react";

import { ExternalSyncExample } from "./examples/external-sync";
import { FileIoExample } from "./examples/file-io";
import { GalleryExample } from "./examples/gallery";
import { MinimalExample } from "./examples/minimal";
import { MultiCanvasExample } from "./examples/multi-canvas";
import { PluginContainerExample } from "./examples/plugin-container";
import { ThemingExample } from "./examples/theming";
import { ViewportExample } from "./examples/viewport";

// Each example lives in one file under src/examples/, as an integration example that can
// be copy-pasted on its own. None of them depends on the shell (their only contract is to
// fill the parent element).
const EXAMPLES: ReadonlyArray<{
	id: string;
	title: string;
	description: string;
	Component: React.ComponentType;
}> = [
	{
		id: "minimal",
		title: "Minimal",
		description: "The smallest setup: mount Canvas with an empty document",
		Component: MinimalExample,
	},
	{
		id: "file-io",
		title: "File I/O",
		description:
			"Loading and saving .jis.json, and restoring an exported PNG by dropping it",
		Component: FileIoExample,
	},
	{
		id: "theming",
		title: "Theming",
		description: "Switching themes with the theme prop (cycling three presets)",
		Component: ThemingExample,
	},
	{
		id: "viewport",
		title: "Viewport",
		description:
			"imperative viewport API（initialConfig.viewport / onViewportChange / ref.current.viewport）",
		Component: ViewportExample,
	},
	{
		id: "external-sync",
		title: "External Sync",
		description:
			"The outside (an editor, an AI) owns the canonical doc and pushes it by replacing the doc",
		Component: ExternalSyncExample,
	},
	{
		id: "multi-canvas",
		title: "Multi Canvas",
		description:
			"Embedding several Canvases (the keyboard is scoped to the focused Canvas)",
		Component: MultiCanvasExample,
	},
	{
		id: "gallery",
		title: "Gallery",
		description: "Viewing real .jis.json files (loads the samples in diagrams/)",
		Component: GalleryExample,
	},
	{
		id: "plugin-container",
		title: "Plugin Container",
		description:
			"Registers the container definition from an external plugin package (UC1 dogfood), excludes the core version, and demonstrates that it works",
		Component: PluginContainerExample,
	},
];

const readExampleIdFromHash = () => window.location.hash.replace(/^#/, "");

/** Gallery that picks an example from the sidebar. The selection is kept in the URL hash (no extra dependency). */
export function GalleryShell() {
	const [selectedId, setSelectedId] = useState(readExampleIdFromHash);

	useEffect(() => {
		const handleHashChange = () => setSelectedId(readExampleIdFromHash());
		window.addEventListener("hashchange", handleHashChange);
		return () => window.removeEventListener("hashchange", handleHashChange);
	}, []);

	useEffect(() => {
		document.title = `canvas examples [${__GIT_BRANCH__}]`;
	}, []);

	const selected =
		EXAMPLES.find((example) => example.id === selectedId) ?? EXAMPLES[0];

	return (
		<div className="gallery">
			<nav className="gallery-sidebar">
				<h1 className="gallery-heading">canvas examples</h1>
				<ul className="gallery-nav">
					{EXAMPLES.map((example) => (
						<li key={example.id}>
							<a
								href={`#${example.id}`}
								className={example.id === selected.id ? "active" : undefined}
							>
								{example.title}
							</a>
						</li>
					))}
				</ul>
				<p className="gallery-description">{selected.description}</p>
				<p className="gallery-source">src/examples/{selected.id}.tsx</p>
			</nav>
			<main className="gallery-content">
				{/* key forces a remount when the example changes, so no state carries over from the previous one */}
				<selected.Component key={selected.id} />
			</main>
		</div>
	);
}
