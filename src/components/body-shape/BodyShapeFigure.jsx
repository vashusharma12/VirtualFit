// Schematic figure drawn from relative widths (shoulders/chest, waist, hips). Illustration only.
const WIDTHS = {
  rectangle: [38, 35, 38],
  triangle: [30, 27, 46],
  'inverted-triangle': [46, 28, 32],
  oval: [38, 42, 36],
  hourglass: [42, 24, 42],
}

export default function BodyShapeFigure({ shape }) {
  const [c, w, h] = WIDTHS[shape]
  const x = (width, side) => 50 + side * (width / 2)
  const d = [
    `M${x(c, -1)} 30`,
    `C${x(c, -1)} 44 ${x(w, -1)} 46 ${x(w, -1)} 58`,
    `C${x(w, -1)} 68 ${x(h, -1)} 70 ${x(h, -1)} 84`,
    `L${x(h, 1)} 84`,
    `C${x(h, 1)} 70 ${x(w, 1)} 68 ${x(w, 1)} 58`,
    `C${x(w, 1)} 46 ${x(c, 1)} 44 ${x(c, 1)} 30`,
    `Q50 24 ${x(c, -1)} 30 Z`,
  ].join(' ')
  return (
    <svg viewBox="0 0 100 110" className="h-full w-full" aria-hidden="true">
      <circle cx="50" cy="14" r="8" fill="#2f4b7c" opacity="0.85" />
      <path d={d} fill="#2f4b7c" opacity="0.85" />
      <path d="M40 84 V104 M60 84 V104" stroke="#2f4b7c" strokeWidth="6" strokeLinecap="round" opacity="0.85" />
    </svg>
  )
}
