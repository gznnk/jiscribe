/**
 * Rewrites an icon name into the canonical spelling: kebab-case behind a layer
 * prefix. The spellings a caller reaches for (`Service/AWS-Lambda`,
 * `service/awsLambda`, `service/aws_lambda`) all land on `service/aws-lambda`.
 *
 * `/` survives, being the layer/service separator. Digits stay where they are
 * (the 53 of `route-53` and the 1 of `container-1` are part of the name), and a
 * run of capitals (`AWS`, `EC2`, `VPC`) counts as one word — AWS names are full
 * of them, and splitting letter by letter makes a different name.
 *
 * @param name - any spelling; passing an already canonical name changes nothing
 * @returns the kebab-case name, or the empty string when nothing but separators
 *   was given
 */
export const normalizeAwsIconName = (name: string): string =>
	name
		.trim()
		// A capital after a lowercase letter or a digit starts a word:
		// "awsLambda" -> "aws-Lambda"
		.replace(/([a-z0-9])([A-Z])/g, "$1-$2")
		// So does a capital followed by a capital and a lowercase letter:
		// "AWSLambda" -> "AWS-Lambda". Splitting every capital would make "AWS"
		// into "a-w-s"
		.replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
		.toLowerCase()
		.replace(/[\s_.]+/g, "-")
		.replace(/-*\/-*/g, "/")
		.replace(/-{2,}/g, "-")
		.replace(/^-+|-+$/g, "");
