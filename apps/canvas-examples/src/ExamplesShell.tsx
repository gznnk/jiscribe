import { useEffect, useState } from "react";

import { ExternalSyncExample } from "./examples/external-sync";
import { FileIoExample } from "./examples/file-io";
import { MinimalExample } from "./examples/minimal";
import { MultiCanvasExample } from "./examples/multi-canvas";
import { PluginsExample } from "./examples/plugins";
import { ThemingExample } from "./examples/theming";
import { ViewportExample } from "./examples/viewport";
import { GALLERY_DIAGRAMS } from "./gallery/diagrams";
import { DiagramView } from "./gallery/DiagramView";
import { JiscribeMark } from "./JiscribeMark";

type ShellEntry = {
	/** Stable slug used as the URL hash. */
	id: string;
	title: string;
	description: string;
	/** Path shown under the selected entry, relative to the app root. */
	source: string;
	Component: React.ComponentType;
};

// Each example lives in one file under src/examples/, as an integration example that can
// be copy-pasted on its own. None of them depends on the shell (their only contract is to
// fill the parent element).
const EXAMPLE_ENTRIES: ReadonlyArray<ShellEntry> = [
	{
		id: "minimal",
		title: "Minimal",
		description: "The smallest setup: mount Canvas with an empty document",
		source: "src/examples/minimal.tsx",
		Component: MinimalExample,
	},
	{
		id: "file-io",
		title: "File I/O",
		description:
			"Loading and saving .jis.json, and restoring an exported PNG by dropping it",
		source: "src/examples/file-io.tsx",
		Component: FileIoExample,
	},
	{
		id: "theming",
		title: "Theming",
		description:
			"Switching themes with the theme prop (cycling the two presets)",
		source: "src/examples/theming.tsx",
		Component: ThemingExample,
	},
	{
		id: "viewport",
		title: "Viewport",
		description:
			"imperative viewport API（initialConfig.viewport / onViewportChange / ref.current.viewport）",
		source: "src/examples/viewport.tsx",
		Component: ViewportExample,
	},
	{
		id: "external-sync",
		title: "External Sync",
		description:
			"The outside (an editor, an AI) owns the canonical doc and pushes it by replacing the doc",
		source: "src/examples/external-sync.tsx",
		Component: ExternalSyncExample,
	},
	{
		id: "multi-canvas",
		title: "Multi Canvas",
		description:
			"Embedding several Canvases (the keyboard is scoped to the focused Canvas)",
		source: "src/examples/multi-canvas.tsx",
		Component: MultiCanvasExample,
	},
	{
		id: "plugins",
		title: "Plugins",
		description:
			"Registering the shipped shape plugins: the plugin array goes to both Canvas and createCanvasParser, and the host lays out their toolbar entries",
		source: "src/examples/plugins.tsx",
		Component: PluginsExample,
	},
];

// Gallery first: opening the app lands on a finished drawing rather than an empty canvas.
const SECTIONS: ReadonlyArray<{
	title: string;
	entries: ReadonlyArray<ShellEntry>;
}> = [
	{
		title: "Gallery",
		entries: GALLERY_DIAGRAMS.map((diagram) => ({
			id: diagram.id,
			title: diagram.title,
			description: diagram.description,
			source: `diagrams/${diagram.fileName}`,
			// Defined once with the array, so the component identity stays stable across renders
			Component: () => <DiagramView diagram={diagram} />,
		})),
	},
	{ title: "Examples", entries: EXAMPLE_ENTRIES },
];

const ALL_ENTRIES = SECTIONS.flatMap((section) => section.entries);

const readEntryIdFromHash = () => window.location.hash.replace(/^#/, "");

/** Shell that picks a gallery diagram or an example from the sidebar. The selection is kept in the URL hash (no extra dependency). */
export function ExamplesShell() {
	const [selectedId, setSelectedId] = useState(readEntryIdFromHash);

	useEffect(() => {
		const handleHashChange = () => setSelectedId(readEntryIdFromHash());
		window.addEventListener("hashchange", handleHashChange);
		return () => window.removeEventListener("hashchange", handleHashChange);
	}, []);

	// The branch tells apart the dev servers of several worktrees; the deployed
	// gallery keeps the plain title from index.html.
	useEffect(() => {
		if (import.meta.env.DEV) {
			document.title = `Jiscribe Canvas Examples [${__GIT_BRANCH__}]`;
		}
	}, []);

	const selected =
		ALL_ENTRIES.find((entry) => entry.id === selectedId) ?? ALL_ENTRIES[0];

	return (
		<div className="examples">
			<nav className="examples-sidebar">
				<div className="examples-brand">
					<JiscribeMark />
					<h1 className="examples-heading">Canvas Examples</h1>
				</div>
				<div className="examples-nav">
					{SECTIONS.map((section) => (
						<section className="examples-section" key={section.title}>
							<h2 className="examples-section-title">{section.title}</h2>
							<ul className="examples-list">
								{section.entries.map((entry) => {
									const isSelected = entry.id === selected.id;
									return (
										<li
											key={entry.id}
											className={
												isSelected ? "examples-item active" : "examples-item"
											}
										>
											<a
												href={`#${entry.id}`}
												aria-current={isSelected ? "page" : undefined}
											>
												{entry.title}
											</a>
											{isSelected && (
												<div className="examples-detail">
													<p className="examples-description">
														{entry.description}
													</p>
													<p className="examples-source">{entry.source}</p>
												</div>
											)}
										</li>
									);
								})}
							</ul>
						</section>
					))}
				</div>
			</nav>
			<main className="examples-content">
				{/* key forces a remount when the selection changes, so no state carries over from the previous one */}
				<selected.Component key={selected.id} />
			</main>
		</div>
	);
}
