import { useEffect, useState } from "react";

import { ExternalSyncExample } from "./examples/external-sync";
import { FileIoExample } from "./examples/file-io";
import { GalleryExample } from "./examples/gallery";
import { MinimalExample } from "./examples/minimal";
import { MultiCanvasExample } from "./examples/multi-canvas";
import { PluginsExample } from "./examples/plugins";
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
		description:
			"Viewing real .jis.json files (loads the samples in diagrams/)",
		Component: GalleryExample,
	},
	{
		id: "plugins",
		title: "Plugins",
		description:
			"Registering the shipped shape plugins: the plugin array goes to both Canvas and createCanvasParser, and the host lays out their toolbar entries",
		Component: PluginsExample,
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
				<div className="gallery-brand">
					<span className="gallery-brand-mark" aria-hidden="true" />
					<h1 className="gallery-heading">canvas examples</h1>
				</div>
				<ul className="gallery-nav">
					{EXAMPLES.map((example) => {
						const isSelected = example.id === selected.id;
						return (
							<li
								key={example.id}
								className={isSelected ? "gallery-item active" : "gallery-item"}
							>
								<a
									href={`#${example.id}`}
									aria-current={isSelected ? "page" : undefined}
								>
									{example.title}
								</a>
								{isSelected && (
									<div className="gallery-detail">
										<p className="gallery-description">{example.description}</p>
										<p className="gallery-source">
											src/examples/{example.id}.tsx
										</p>
									</div>
								)}
							</li>
						);
					})}
				</ul>
			</nav>
			<main className="gallery-content">
				{/* key forces a remount when the example changes, so no state carries over from the previous one */}
				<selected.Component key={selected.id} />
			</main>
		</div>
	);
}
