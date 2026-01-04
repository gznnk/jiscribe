import { SvgCanvas2 } from "@workspace/svg-canvas-2";
import "./App.css";

export function App() {
	return (
		<div className="app">
			<h1>SvgCanvas2 デモアプリ</h1>
			<p>svg-canvas-2パッケージの動作確認用アプリケーションです。</p>
			<div className="canvas-container">
				<SvgCanvas2 width={800} height={600} />
			</div>
		</div>
	);
}
