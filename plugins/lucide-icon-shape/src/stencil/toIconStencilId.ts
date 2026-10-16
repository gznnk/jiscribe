/**
 * Preset id of the palette entry for one icon: the type name with the icon's own name
 * appended (`lucideIconFileText`). Prefixed because preset ids share one space across
 * every plugin a host applies, and bare names like `lock` are already taken by the
 * pictogram shapes; written as one word because the id travels inside a `data-action`
 * whose own separator is the colon.
 */
export const toIconStencilId = (name: string): string =>
	`lucideIcon${name
		.split("-")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join("")}`;
