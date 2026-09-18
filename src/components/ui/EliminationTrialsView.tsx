import React from 'react';
import { ClinicalEliminationModal } from './ClinicalEliminationModal';

export interface EliminationTrialsViewProps {
  initialProtocolId?: string | null;
}

export const EliminationTrialsView: React.FC<EliminationTrialsViewProps> = ({ initialProtocolId }) => {
  return <ClinicalEliminationModal inline={true} initialProtocolId={initialProtocolId} />;
};

export default EliminationTrialsView;
