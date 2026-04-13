import { SvgCanvas2 } from "@workspace/svg-canvas-2";
import "./App.css";

export function App() {
	return (
		<div className="app">
			<div
				style={{
					position: "fixed",
					bottom: 8,
					right: 8,
					padding: "2px 8px",
					background: "rgba(0,0,0,0.5)",
					color: "#fff",
					fontSize: 12,
					borderRadius: 4,
					zIndex: 9999,
					pointerEvents: "none",
				}}
			>
				{__GIT_BRANCH__}
			</div>
			<SvgCanvas2 />
		</div>
	);
}
