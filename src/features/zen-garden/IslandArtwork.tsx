import { useId } from 'react';
import type { IslandTheme } from '../../services/gamification/policy';
import { ISLAND_COLORS, ISLAND_SITES, ISLAND_TREES, islandFlowers } from './islandLayout';
const project = (x: number, z: number) => ({ x: 400 + (x - z) * 36, y: 234 + (x + z) * 18 });
export function IslandArtwork({
  level,
  growth,
  theme,
  compact = false,
}: {
  level: number;
  growth: number;
  theme: IslandTheme;
  compact?: boolean;
}) {
  const id = useId().replace(/:/g, ''),
    palette = ISLAND_COLORS[theme];
  const cottage = project(...ISLAND_SITES.cottage),
    pond = project(...ISLAND_SITES.pond),
    greenhouse = project(...ISLAND_SITES.greenhouse),
    pavilion = project(...ISLAND_SITES.pavilion),
    bed = project(...ISLAND_SITES.bed),
    windmill = project(...ISLAND_SITES.windmill);
  return (
    <svg
      className="island-artwork"
      viewBox={compact ? '150 80 500 350' : '0 0 800 480'}
      role="img"
      aria-label={`Cozy floating island, garden level ${level}`}
      style={{ background: `linear-gradient(${palette.sky}, ${palette.horizon})` }}
    >
      <defs>
        <linearGradient id={`${id}grass`} x2="0" y2="1">
          <stop stopColor={palette.meadow} />
          <stop offset="1" stopColor={palette.grass} />
        </linearGradient>
      </defs>
      <circle cx="640" cy="72" r="32" fill="#fff2c3" opacity=".75" />
      <g className="island-clouds" fill="#fff" opacity=".65">
        <ellipse cx="144" cy="93" rx="66" ry="11" />
        <ellipse cx="153" cy="81" rx="33" ry="20" />
        <ellipse cx="653" cy="168" rx="64" ry="12" />
        <ellipse cx="668" cy="154" rx="31" ry="22" />
      </g>
      <ellipse cx="400" cy="411" rx="152" ry="17" fill="#75867f" opacity=".12" />
      <g className="island-floating">
        <path d="M166 241 L219 329 L350 379 L420 401 L564 326 L634 241Z" fill={palette.rock} />
        <path d="M166 241 L287 287 L350 379 L219 329Z" fill="#bbaa92" />
        <path d="M420 401 L465 286 L634 241 L564 326Z" fill="#8e8c7e" />
        <ellipse cx="400" cy="247" rx="235" ry="108" fill="#d3c6a6" />
        <ellipse cx="400" cy="235" rx="230" ry="103" fill={`url(#${id}grass)`} />
        {[
          [-2.6, -1.65],
          [2.6, -1.7],
          [-1.65, 2.5],
          [2.8, 2.25],
        ].map(([x, z], index) => {
          const p = project(x, z);
          return (
            <ellipse
              key={index}
              cx={p.x}
              cy={p.y}
              rx="38"
              ry="16"
              fill={palette.meadow}
              opacity=".8"
            />
          );
        })}
        <ellipse cx="400" cy="234" rx="188" ry="78" fill="none" stroke="#e9e4cc" strokeWidth="14" />
        <path
          d="M350 221 L401 256 L425 277 M401 256 L486 209"
          fill="none"
          stroke="#e9e4cc"
          strokeWidth="12"
          strokeLinecap="round"
        />
        {level >= 3 && (
          <g transform={`translate(${pond.x} ${pond.y})`}>
            <ellipse rx="48" ry="23" fill="#e2ceab" />
            <ellipse rx="40" ry="18" fill={palette.water} />
            <g className="island-ripples" fill="none" stroke="#e1fff4" opacity=".75">
              <ellipse cx="14" cy="6" rx="12" ry="4" />
              <path d="M-30 1 Q0-8 30 1" />
            </g>
            <ellipse cx="-17" cy="9" rx="7" ry="3" fill="#6d9a5e" />
            <circle cx="-16" cy="6" r="3" fill="#f7c3bf" />
            <g transform="translate(14 3)">
              <ellipse rx="6" ry="4" fill="#fff0ce" />
              <circle cx="3" cy="-5" r="3" fill="#fff0ce" />
              <path d="M5-5h4" stroke="#e5a249" strokeWidth="2" />
            </g>
            <path d="M-19-20 L24 8" stroke="#c09d78" strokeWidth="12" />
            <path d="M-20-24 L27 5" stroke="#9b8066" strokeWidth="3" />
          </g>
        )}
        {level >= 2 && (
          <g transform={`translate(${bed.x} ${bed.y})`}>
            <path d="M-29 0 L5-17 L38 0 L5 17Z" fill="#ad906d" />
            {[-14, 3, 20].map((x, index) => (
              <g key={x} transform={`translate(${x} ${index * 3 - 4})`}>
                <path d="M0 0 L0-8" stroke="#739966" strokeWidth="2" />
                <circle cy="-10" r="5" fill={palette.flowers[index % 3]} />
              </g>
            ))}
          </g>
        )}
        {level >= 3 && (
          <g transform="translate(500 264)" stroke="#b29472" strokeWidth="5" strokeLinecap="round">
            <path d="M-14-3 L13 11 M-14-13 L13 1 M-9 1 L-9 10 M9 10 L9 18" />
          </g>
        )}
        {ISLAND_TREES.map((tree, index) => {
          const p = project(tree.x, tree.z);
          return (
            <g key={index} transform={`translate(${p.x} ${p.y}) scale(${tree.scale})`}>
              <ellipse cy="6" rx="24" ry="10" fill="#647a54" opacity=".12" />
              <path d="M0 1 L0-45" stroke="#a98769" strokeWidth="9" strokeLinecap="round" />
              <circle cx="-12" cy="-50" r="23" fill={palette.leaves[0]} />
              <circle cx="12" cy="-57" r="24" fill={palette.leaves[1]} />
              <circle cy="-72" r="23" fill={palette.leaves[2]} />
              <ellipse
                cx="14"
                cy="-2"
                rx="17"
                ry="10"
                fill={theme === 'blossom' ? '#8ea76b' : palette.leaves[1]}
              />
            </g>
          );
        })}
        <g transform={`translate(${cottage.x} ${cottage.y})`}>
          <ellipse cy="21" rx="58" ry="20" fill="#657953" opacity=".13" />
          <path d="M-40-12 L5 12 L5 55 L-40 31Z" fill="#eadfc8" />
          <path d="M5 12 L47-13 L47 31 L5 55Z" fill="#f8eed7" />
          <path d="M-47-15 L-2-47 L55-14 L7 17Z" fill={palette.roof} />
          <path d="M-47-15 L-2-47 L-8-12Z" fill={palette.roofShade} />
          <path d="M25-41 L25-65 L36-59 L36-34Z" fill="#cbbda9" />
          <g className="island-smoke" fill="#fff7e9" opacity=".7">
            <circle cx="30" cy="-72" r="5" />
            <circle cx="33" cy="-81" r="7" />
            <circle cx="36" cy="-93" r="9" />
          </g>
          <path d="M19 30 L33 22 L33 42 L19 49Z" fill="#9f9275" />
          <path d="M-27 0 L-14 7 L-14 20 L-27 13Z M16 15 L28 8 L28 20 L16 27Z" fill="#f3c980" />
          <path d="M-29 14 L-12 23" stroke="#ab7856" strokeWidth="6" />
          <g fill={palette.flowers[0]}>
            <circle cx="-26" cy="11" r="3" />
            <circle cx="-20" cy="14" r="3" />
            <circle cx="-14" cy="17" r="3" />
          </g>
          <path d="M16 0 L28-8 L52 6 L39 14Z" fill={palette.roof} />
          <path d="M16 0 L16 31 M39 14 L39 42" stroke="#b49269" strokeWidth="2" />
          <path d="M2 60 L48 34" stroke="#d3b691" strokeWidth="5" strokeLinecap="round" />
        </g>
        {level >= 4 && (
          <g transform={`translate(${greenhouse.x} ${greenhouse.y})`}>
            <path d="M-27-6 L0-24 L30-6 L1 10Z" fill="#dceae1" />
            <path d="M-27-6 L1 10 L1 42 L-27 27Z" fill="#a9c9b9" />
            <path d="M1 10 L30-6 L30 26 L1 42Z" fill="#c0dcd0" />
            <path
              d="M-14 2 L-14 34 M16 1 L16 33 M-27 10 L1 26 L30 10"
              stroke="#ecedda"
              strokeWidth="3"
            />
          </g>
        )}
        {level >= 4 && (
          <g transform={`translate(${pavilion.x} ${pavilion.y})`}>
            <ellipse cy="23" rx="30" ry="12" fill="#ceb591" />
            <path d="M-18-3 L-18 21 M18-3 L18 21 M0 5 L0 32" stroke="#b79a78" strokeWidth="4" />
            <path d="M-34-3 L0-29 L34-3 L0 10Z" fill={palette.roof} />
          </g>
        )}
        {level >= 4 &&
          [330, 400, 470].map((x) => (
            <g key={x} transform={`translate(${x} 300)`}>
              <path d="M0 0 L0-21" stroke="#997f62" strokeWidth="2" />
              <rect x="-4" y="-27" width="8" height="9" rx="2" fill="#f4d49a" stroke="#ba9d77" />
            </g>
          ))}
        {level >= 5 &&
          [376, 417, 458].map((x, index) => (
            <g key={x} transform={`translate(${x} ${159 + index * 7})`}>
              <path d="M0 0 L0-25" stroke="#a38868" strokeWidth="5" />
              <circle cy="-34" r="18" fill={palette.leaves[1]} />
              <g fill="#dda578">
                <circle cx="-9" cy="-30" r="3" />
                <circle cx="7" cy="-39" r="3" />
                <circle cx="6" cy="-24" r="3" />
              </g>
            </g>
          ))}
        {level >= 5 && (
          <g transform={`translate(${windmill.x} ${windmill.y})`}>
            <path d="M-13 32 L-8-13 L10-13 L17 32Z" fill="#f1e8d3" />
            <path d="M-16-12 L1-35 L18-12Z" fill={palette.roof} />
            <path
              className="island-windmill"
              d="M1-17 L1 12 M-13-3 L15-3"
              stroke="#a49179"
              strokeWidth="6"
              strokeLinecap="round"
            />
          </g>
        )}
        {islandFlowers(growth).map((flower, index) => {
          const p = project(flower.x, flower.z);
          return (
            <g key={index} transform={`translate(${p.x} ${p.y})`}>
              <path d="M0 0 L0-8" stroke="#739966" strokeWidth="2" />
              <circle cy="-9" r="4" fill={palette.flowers[index % 3]} />
              <circle cy="-9" r="1.5" fill="#b69360" />
            </g>
          );
        })}
        <g fill="#e7e0cc">
          {[
            [-3.8, 0.2],
            [3.6, -1.5],
            [-1, 3.8],
            [2.7, 2.8],
          ].map(([x, z], index) => {
            const p = project(x, z);
            return <ellipse key={index} cx={p.x} cy={p.y} rx="9" ry="5" />;
          })}
        </g>
        <g className="island-butterflies">
          {[
            [-0.1, 1.3],
            [2.5, -0.7],
          ].map(([x, z], index) => {
            const p = project(x, z);
            return (
              <g
                key={index}
                transform={`translate(${p.x} ${p.y - 30})`}
                fill={palette.flowers[index]}
              >
                <ellipse cx="-4" rx="4" ry="3" transform="rotate(20)" />
                <ellipse cx="4" rx="4" ry="3" transform="rotate(-20)" />
              </g>
            );
          })}
        </g>
      </g>
      <g
        className="island-birds"
        stroke="#7c9989"
        fill="none"
        strokeWidth="2.5"
        strokeLinecap="round"
      >
        <path d="M275 88 q6-6 12 0 q6-6 12 0 M536 107 q5-5 10 0 q5-5 10 0" />
      </g>
    </svg>
  );
}
