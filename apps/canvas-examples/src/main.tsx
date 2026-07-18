import React from "react";
import ReactDOM from "react-dom/client";
import "katex/dist/katex.min.css";

import { GalleryShell } from "./GalleryShell";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
	<React.StrictMode>
		<GalleryShell />
	</React.StrictMode>,
);
