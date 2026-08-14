/**
 * The Jiscribe brand mark (rounded teal square with the circle / triangle /
 * square composition). Strokes scale with the viewBox, so the shapes stay
 * readable at the sidebar's small rendering size.
 */
export function JiscribeMark() {
	return (
		<svg
			className="examples-brand-mark"
			viewBox="0 0 240 240"
			role="img"
			aria-label="Jiscribe"
		>
			<defs>
				<linearGradient id="jiscribe-mark-bg" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0" stopColor="#0f9e8f" />
					<stop offset="1" stopColor="#075e56" />
				</linearGradient>
			</defs>
			<rect width="240" height="240" rx="54" fill="url(#jiscribe-mark-bg)" />
			<g
				fill="none"
				stroke="#ecfffb"
				strokeWidth="10"
				strokeLinejoin="round"
				strokeLinecap="round"
				transform="translate(116 116) scale(1.12) translate(-115 -117)"
			>
				<circle cx="118" cy="92" r="46" />
				<path d="M82 96 L38 176 L130 176 Z" />
				<rect x="112" y="108" width="80" height="80" rx="8" />
			</g>
		</svg>
	);
}
