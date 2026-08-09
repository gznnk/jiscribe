import { useEffect, useState } from "react";

import { ExternalSyncExample } from "./examples/external-sync";
import { FileIoExample } from "./examples/file-io";
import { GalleryExample } from "./examples/gallery";
import { MinimalExample } from "./examples/minimal";
import { MultiCanvasExample } from "./examples/multi-canvas";
import { PluginContainerExample } from "./examples/plugin-container";
import { ThemingExample } from "./examples/theming";
import { ViewportExample } from "./examples/viewport";

// 各 example は「単体でコピペ可能な統合例」として src/examples/ に 1 ファイルで置く。
// シェルへの依存を持たせない（親要素いっぱいに描画する、が唯一の契約）。
const EXAMPLES: ReadonlyArray<{
	id: string;
	title: string;
	description: string;
	Component: React.ComponentType;
}> = [
	{
		id: "minimal",
		title: "Minimal",
		description: "空ドキュメントで Canvas をマウントする最小構成",
		Component: MinimalExample,
	},
	{
		id: "file-io",
		title: "File I/O",
		description:
			".jis.json の読み込み・保存と、エクスポート PNG のドロップ復元",
		Component: FileIoExample,
	},
	{
		id: "theming",
		title: "Theming",
		description: "theme prop によるテーマ切り替え（プリセット3種の巡回）",
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
			"外部（エディタ・AI）が doc の正本を持ち、doc 差し替えで push する",
		Component: ExternalSyncExample,
	},
	{
		id: "multi-canvas",
		title: "Multi Canvas",
		description:
			"複数 Canvas の埋め込み（キーボードはフォーカスされた Canvas にスコープ）",
		Component: MultiCanvasExample,
	},
	{
		id: "gallery",
		title: "Gallery",
		description: "実物 .jis.json の閲覧（diagrams/ の作例を読み込む）",
		Component: GalleryExample,
	},
	{
		id: "plugin-container",
		title: "Plugin Container",
		description:
			"外部プラグインパッケージ（UC1 dogfood）から container 定義を登録し、core 版を除外して動作を実証する",
		Component: PluginContainerExample,
	},
];

const readExampleIdFromHash = () => window.location.hash.replace(/^#/, "");

/** サイドバーで example を選ぶギャラリー。選択状態は URL ハッシュで持つ（依存を増やさない）。 */
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
				{/* example 切り替え時は key で強制リマウントし、前の example の状態を持ち越さない */}
				<selected.Component key={selected.id} />
			</main>
		</div>
	);
}
