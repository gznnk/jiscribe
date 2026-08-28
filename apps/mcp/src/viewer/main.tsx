import React from "react";
import ReactDOM from "react-dom/client";
// markdown 図形の数式描画に katex の CSS が要る
import "@jiscribe/canvas/fonts.css";
import "katex/dist/katex.min.css";
// hljs-* トークンの配色だけを借りる。テーマの .hljs（背景・既定色）は
// 対象要素にそのクラスを付けていないので当たらない
import "highlight.js/styles/github-dark.css";

import { App } from "./App";
import "./viewer.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
	<React.StrictMode>
		<App />
	</React.StrictMode>,
);
