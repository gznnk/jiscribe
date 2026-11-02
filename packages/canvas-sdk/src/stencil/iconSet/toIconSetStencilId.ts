/**
 * The preset id of one icon: a prefix with the icon name in PascalCase after it
 * (`awsIcon` + `service/aws-lambda` → `awsIconServiceAwsLambda`). Preset ids
 * share one space across every plugin a host applies, hence the prefix, and `:`
 * cannot appear in one because it separates the DOM's `data-action="item:{id}"`.
 *
 * @param stencilIdPrefix - the set's own prefix, by convention its object type
 *   (`awsIcon`)
 * @param icon - the canonical icon name, in which both `/` and `-` separate words
 * @returns a preset id that collides with no other set's
 */
export const toIconSetStencilId = (
	stencilIdPrefix: string,
	icon: string,
): string =>
	`${stencilIdPrefix}${icon
		.split(/[/-]/)
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join("")}`;
