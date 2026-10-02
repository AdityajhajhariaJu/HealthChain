import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Sprout, Trophy, X } from 'lucide-react';
import FocusTrap from './FocusTrap';
import { getGamificationHub } from '../../services/GamificationHub';
import { TIERS } from '../../services/VitalityPointsEngine';
import './VitalityPointsModal.css';
const activities = [
  {
    family: 'record',
    title: 'Save a useful record',
    detail: 'A check-in, meal or other personal observation',
    route: '/app/today',
    icon: '📝',
  },
  {
    family: 'reflect',
    title: 'Keep a reflection',
    detail: 'A Gut question, reflection or progress snapshot',
    route: '/app/today',
    icon: '🌱',
  },
  {
    family: 'calm',
    title: 'Take a gentle moment',
    detail: 'Tend your garden or complete a calming session',
    route: '/app/today',
    icon: '🪷',
  },
  {
    family: 'learn',
    title: 'Save a research source',
    detail: 'Keep a source that matters to you',
    route: '/app/trials',
    icon: '📖',
  },
  {
    family: 'prepare',
    title: 'Prepare for a conversation',
    detail: 'Save care questions or organize your profile',
    route: '/app/case-prep',
    icon: '💬',
  },
] as const;
export default function VitalityPointsModal() {
  const [open, setOpen] = useState(false),
    [tab, setTab] = useState('activities'),
    [hub, setHub] = useState(getGamificationHub);
  const navigate = useNavigate();
  useEffect(() => {
    const refresh = () => setHub(getGamificationHub()),
      show = () => {
        refresh();
        setOpen(true);
      },
      close = () => setOpen(false);
    window.addEventListener('hc_open_points_modal', show);
    window.addEventListener('hc_points_updated', refresh);
    window.addEventListener('hc_profile_updated', refresh);
    window.addEventListener('hc_logout', close);
    return () => {
      window.removeEventListener('hc_open_points_modal', show);
      window.removeEventListener('hc_points_updated', refresh);
      window.removeEventListener('hc_profile_updated', refresh);
      window.removeEventListener('hc_logout', close);
    };
  }, []);
  if (!open) return null;
  return (
    <div
      className="points-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) setOpen(false);
      }}
    >
      <FocusTrap onEscape={() => setOpen(false)} style={{ maxWidth: 560, height: 'auto' }}>
        <section
          className="points-hub"
          role="dialog"
          aria-modal="true"
          aria-labelledby="points-hub-title"
        >
          <header>
            <div>
              <span>YOUR MOMENTS OF CARE</span>
              <h2 id="points-hub-title">Vitality points</h2>
            </div>
            <button
              type="button"
              aria-label="Close points and activity"
              onClick={() => setOpen(false)}
            >
              <X size={20} />
            </button>
          </header>
          <div className="points-totals">
            <div>
              <strong>{hub.points}</strong>
              <span>Points earned</span>
            </div>
            <div>
              <strong>
                {hub.todayGrowth}
                <small>/6</small>
              </strong>
              <span>Garden growth today</span>
            </div>
            <div>
              <strong>{hub.trophies.length}</strong>
              <span>Milestones</span>
            </div>
          </div>
          <div className="points-tabs" role="group" aria-label="Points views">
            {['activities', 'progress', 'history'].map((view) => (
              <button
                key={view}
                type="button"
                aria-pressed={tab === view}
                onClick={() => setTab(view)}
              >
                {view.charAt(0).toUpperCase() + view.slice(1)}
              </button>
            ))}
          </div>
          <div className="points-content">
            {tab === 'activities' && (
              <>
                <p className="points-note">
                  Your first three different activity categories each day can earn 5 points each, up
                  to 15. Garden growth follows 3, 2 and 1. Pick what is useful to you; rest never
                  removes progress.
                </p>
                {activities.map((activity) => (
                  <div className="points-activity" key={activity.family}>
                    <span aria-hidden="true">{activity.icon}</span>
                    <div>
                      <strong>{activity.title}</strong>
                      <small>{activity.detail}</small>
                    </div>
                    {hub.todayFamilies.includes(activity.family) ? (
                      <span className="points-recorded">
                        <Check size={15} /> Recorded
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setOpen(false);
                          navigate(activity.route);
                        }}
                      >
                        Explore
                      </button>
                    )}
                  </div>
                ))}
              </>
            )}
            {tab === 'progress' && (
              <>
                <p className="points-note">
                  Points recognize participation, not your health status. Your island grows
                  separately and cannot be rushed by repeated actions or AI calls.
                </p>
                {TIERS.map((tier) => (
                  <div className="points-tier" key={tier.level}>
                    <span aria-hidden="true">{tier.badge}</span>
                    <div>
                      <strong>{tier.name}</strong>
                      <small>{tier.perk}</small>
                    </div>
                    <span>{hub.points >= tier.min ? 'Reached' : `${tier.min} points`}</span>
                  </div>
                ))}
              </>
            )}
            {tab === 'history' && (
              <>
                <p className="points-note">
                  Existing points are preserved. The history below explains new activity recorded by
                  the shared rewards hub.
                </p>
                {hub.history.length ? (
                  <ul className="points-history">
                    {hub.history.slice(0, 120).map((item) => (
                      <li key={item.id}>
                        <Sprout size={16} />
                        <div>
                          <strong>{item.title}</strong>
                          <small>{item.day}</small>
                        </div>
                        <span>
                          {item.points ? `+${item.points} points` : 'Recorded'}
                          <small>
                            {item.growth
                              ? `+${item.growth} growth`
                              : 'Daily category already counted'}
                          </small>
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="points-note">Your next saved activity will appear here.</p>
                )}
              </>
            )}
          </div>
          <footer>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                navigate('/app/trophies');
              }}
            >
              <Trophy size={16} /> Open Trophy Cabinet
            </button>
          </footer>
        </section>
      </FocusTrap>
    </div>
  );
}
