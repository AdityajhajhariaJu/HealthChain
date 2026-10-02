import { useEffect, useState } from 'react';
import { getGamificationHub } from '../../services/GamificationHub';
export function useGarden() {
  const [garden, setGarden] = useState(getGamificationHub);
  useEffect(() => {
    const refresh = () => setGarden(getGamificationHub());
    const events = ['hc_gamification_updated', 'hc_profile_updated', 'hc_logout', 'storage'];
    events.forEach((event) => window.addEventListener(event, refresh));
    // A page left open across midnight still gets a fresh daily budget.
    const timer = setInterval(refresh, 60_000);
    return () => {
      clearInterval(timer);
      events.forEach((event) => window.removeEventListener(event, refresh));
    };
  }, []);
  return garden;
}
