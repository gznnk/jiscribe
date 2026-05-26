/// <reference types="vite/client" />

// Markdown files imported as text
declare module "*.md" {
	const content: string;
	export default content;
}

// Markdown files imported with ?raw suffix (Vite specific)
declare module "*.md?raw" {
	const content: string;
	export default content;
}
