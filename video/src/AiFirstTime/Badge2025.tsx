import React from "react";

// A scalloped "2025 / Good!" badge icon, recreated to resemble the
// reference sticker (green flower-edge badge with a "Good!" ribbon).
export const Badge2025: React.FC<{ size?: number }> = ({ size = 64 }) => {
	const dotColors = [
		"#f4c542",
		"#e8543f",
		"#f4c542",
		"#e8543f",
		"#f4c542",
		"#e8543f",
		"#f4c542",
		"#e8543f",
		"#f4c542",
		"#e8543f",
		"#f4c542",
		"#e8543f",
	];

	const petals = new Array(12).fill(0).map((_, i) => {
		const angle = (i / 12) * Math.PI * 2;
		const cx = 50 + Math.cos(angle) * 44;
		const cy = 50 + Math.sin(angle) * 44;
		return { cx, cy, color: dotColors[i] };
	});

	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 100 100"
			style={{ display: "block" }}
		>
			{petals.map((p, i) => (
				<circle key={i} cx={p.cx} cy={p.cy} r={9} fill={p.color} />
			))}
			<circle cx={50} cy={50} r={38} fill="#6fae3e" />
			<circle cx={50} cy={50} r={38} fill="none" stroke="#5c9531" strokeWidth={2} />
			<text
				x={50}
				y={44}
				textAnchor="middle"
				fontFamily="Arial, sans-serif"
				fontWeight={800}
				fontSize={17}
				fill="#1a1a1a"
			>
				2025
			</text>
			<g transform="rotate(-8 50 66)">
				<rect x={20} y={58} width={60} height={16} rx={3} fill="#e0562f" />
				<text
					x={50}
					y={70}
					textAnchor="middle"
					fontFamily="Georgia, serif"
					fontStyle="italic"
					fontWeight={700}
					fontSize={12}
					fill="#ffffff"
				>
					Good!
				</text>
			</g>
		</svg>
	);
};
