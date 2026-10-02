import { lazy, Suspense, useState } from 'react';
import { ArrowRight, Flower2, RotateCcw, Sprout, Trophy, Wind } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';
import { setIslandTheme, tendIsland } from '../../services/GamificationHub';
import { ISLAND_THEMES } from '../../services/gamification/policy';
import { IslandArtwork } from './IslandArtwork';
import { useGarden } from './useGarden';
import './ZenGarden.css';
const CozyIslandScene = lazy(() => import('./CozyIslandScene'));
let available3D: boolean | undefined;
function supportsIsland3D() {
  if (available3D !== undefined) return available3D;
  try {
    const context = document.createElement('canvas').getContext('webgl2');
    available3D = !!context;
    context?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    available3D = false;
  }
  return available3D;
}
export function ZenGarden({
  onOpenMindfulness,
  onClose,
}: {
  onOpenMindfulness?: () => void;
  onClose?: () => void;
}) {
  const garden = useGarden(),
    navigate = useNavigate();
  const [angle, setAngle] = useState(0),
    [status, setStatus] = useState(''),
    [tending, setTending] = useState(false),
    [render3D, setRender3D] = useState(supportsIsland3D);
  const progress = garden.next
    ? Math.round(
        Math.min(
          1,
          garden.growth / garden.next.growth,
          garden.participationDays / garden.next.days
        ) * 100
      )
    : 100;
  const handleTend = () => {
    const result = tendIsland();
    if (!result.saved) {
      setStatus('Your tending could not be saved. Please try again.');
      return;
    }
    setStatus(
      result.growth
        ? `A little care goes a long way. +${result.growth} garden growth${result.points ? ` and ${result.points} points` : ''}.`
        : 'Your island is tended. Today’s calm activity is already recorded.'
    );
    setTending(true);
  };
  return (
    <section className="zen-garden" aria-label="Your cozy island">
      <header className="zen-heading">
        <span>
          <Sprout size={16} /> A PLACE TO EXHALE
        </span>
        <h2>Your little island</h2>
        <p>Small moments of care, slowly becoming something beautiful.</p>
      </header>
      <div
        className="zen-scene"
        data-theme={garden.theme}
        data-tending={tending}
        onAnimationEnd={() => setTending(false)}
      >
        <span className="zen-stage">{garden.stage.name}</span>
        <div
          className="zen-canvas"
          role="img"
          aria-label={`Your island: ${garden.stage.name}, ${garden.growth} growth, ${garden.participationDays} participation days`}
        >
          <ErrorBoundary
            onError={() => setRender3D(false)}
            fallback={
              <IslandArtwork
                level={garden.stage.level}
                growth={garden.growth}
                theme={garden.theme}
              />
            }
          >
            {render3D ? (
              <Suspense
                fallback={
                  <IslandArtwork
                    level={garden.stage.level}
                    growth={garden.growth}
                    theme={garden.theme}
                  />
                }
              >
                <CozyIslandScene
                  level={garden.stage.level}
                  growth={garden.growth}
                  theme={garden.theme}
                  angle={angle}
                />
              </Suspense>
            ) : (
              <IslandArtwork
                level={garden.stage.level}
                growth={garden.growth}
                theme={garden.theme}
              />
            )}
          </ErrorBoundary>
        </div>
        {render3D && (
          <div className="zen-camera" aria-label="Island view controls">
            <button
              type="button"
              onClick={() => setAngle((value) => value - 0.4)}
              aria-label="Turn island left"
            >
              ↶
            </button>
            <button type="button" onClick={() => setAngle(0)} aria-label="Reset island view">
              <RotateCcw size={15} />
            </button>
            <button
              type="button"
              onClick={() => setAngle((value) => value + 0.4)}
              aria-label="Turn island right"
            >
              ↷
            </button>
          </div>
        )}
      </div>
      <div className="zen-themes" role="group" aria-label="Island atmosphere">
        {ISLAND_THEMES.map((theme) => (
          <button
            key={theme.id}
            type="button"
            aria-pressed={garden.theme === theme.id}
            onClick={() => {
              if (!setIslandTheme(theme.id))
                setStatus('Your atmosphere could not be saved. Try again.');
            }}
          >
            <span style={{ background: theme.sky }} />
            {theme.label}
          </button>
        ))}
      </div>
      <div className="zen-summary">
        <div>
          <strong>
            {garden.todayGrowth}
            <small>/6</small>
          </strong>
          <span>Growth today</span>
        </div>
        <div>
          <strong>{garden.participationDays}</strong>
          <span>Days of care</span>
        </div>
        <div>
          <strong>{garden.points}</strong>
          <span>Vitality points</span>
        </div>
      </div>
      <button type="button" className="zen-tend" onClick={handleTend} disabled={garden.tendedToday}>
        <Flower2 size={19} />
        {garden.tendedToday ? 'Your island is tended today' : 'Tend your island'}
        <span>
          {garden.tendedToday ? 'See you whenever you’re ready' : 'Take one gentle moment'}
        </span>
      </button>
      <p className="zen-status" role="status">
        {status}
      </p>
      <div className="zen-next">
        <span>GROWING AT YOUR PACE</span>
        <h3>{garden.next ? `Next: ${garden.next.name}` : 'Your haven is flourishing'}</h3>
        <p>{garden.next ? garden.next.unlock : 'Enjoy your garden and make it your own.'}</p>
        <div
          role="progressbar"
          aria-label="Next island transformation"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <span style={{ width: `${progress}%` }} />
        </div>
        {garden.next && (
          <p className="zen-requirements">
            {garden.nextGrowth} more growth · {garden.nextDays} more participation days
          </p>
        )}
        <small>Days do not need to be consecutive. Rest never takes anything away.</small>
      </div>
      <details className="zen-explanation">
        <summary>How your island grows</summary>
        <p>
          Your first three different activity categories each day add 3, 2 and 1 growth. Each can
          also earn 5 points, up to 15 per day. Tending and calming sessions share one category.
          Larger changes need growth and participation across several days.
        </p>
        <p>
          Saved records, reflections, research sources and appointment preparation can contribute.
          Repeated actions and API calls add no extra growth. Your symptoms and health results never
          determine rewards.
        </p>
        <p>
          Daily limits use {garden.timezone}. Existing points and earned garden stages are
          preserved.
        </p>
      </details>
      <div className="zen-recent">
        <h3>Little moments that made a difference</h3>
        {garden.history.length ? (
          <ul>
            {garden.history.slice(0, 3).map((item) => (
              <li key={item.id}>
                <Sprout size={15} />
                <span>
                  {item.title}
                  <small>{item.day}</small>
                </span>
                <strong>{item.growth ? `+${item.growth} growth` : 'Recorded'}</strong>
              </li>
            ))}
          </ul>
        ) : (
          <p>Your first moment of care will appear here. You can begin by tending your island.</p>
        )}
      </div>
      <div className="zen-links">
        {onOpenMindfulness && (
          <button type="button" onClick={onOpenMindfulness}>
            <Wind size={17} /> Soundscapes & calm <ArrowRight size={16} />
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            onClose?.();
            navigate('/app/trophies');
          }}
        >
          <Trophy size={17} /> Trophy Cabinet <ArrowRight size={16} />
        </button>
        <button
          type="button"
          onClick={() => {
            onClose?.();
            window.dispatchEvent(new Event('hc_open_points_modal'));
          }}
        >
          <Sprout size={17} /> Points & activity <ArrowRight size={16} />
        </button>
      </div>
    </section>
  );
}
