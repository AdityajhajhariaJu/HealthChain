import React from 'react';
import { MedicalActionIsland } from '../../components/ui/MedicalActionIsland';
import { ImmersiveFeatureFeed } from './ImmersiveFeatureFeed';

export default function CaseDashboard() {
  return (
    <div className="w-full min-h-screen bg-[#020617] flex flex-col relative overflow-x-hidden" style={{
      paddingTop: 'calc(24px + max(env(safe-area-inset-top, 44px), 44px))',
      paddingBottom: '80px',
    }}>
      {/* Top Floating Island (Urgent Meds / Reminders) */}
      <div className="w-full px-4 mb-6 z-50 sticky top-4">
        <MedicalActionIsland />
      </div>

      {/* Main Immersive Feed */}
      <ImmersiveFeatureFeed />
    </div>
  );
}