import React from 'react';
import { FeatureId } from '../../services/FeatureArchitectureContract';

export interface FeatureMissionHeaderProps {
  featureId?: FeatureId;
  activeCaseId?: string;
  customAction?: React.ReactNode;
  showHandoffs?: boolean;
  style?: React.CSSProperties;
  onNavigateTab?: (tabKey: string) => void;
}

export const FeatureMissionHeader: React.FC<FeatureMissionHeaderProps> = () => {
  // Permanently disabled: no mission/purpose/role banners across any tab
  return null;
};
