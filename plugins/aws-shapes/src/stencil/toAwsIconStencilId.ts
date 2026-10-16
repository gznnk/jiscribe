/**
 * The preset id: the type name with the icon name in PascalCase after it
 * (`awsIconAwsLambda`). Preset ids share one space across every plugin a host
 * applies, hence the prefix, and `:` cannot appear in one because it separates
 * the DOM's `data-action="item:{id}"`.
 *
 * @param icon - the canonical icon name, in which both `/` and `-` separate words
 * @returns a preset id that collides with nothing
 */
export const toAwsIconStencilId = (icon: string): string =>
	`awsIcon${icon
		.split(/[/-]/)
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join("")}`;
