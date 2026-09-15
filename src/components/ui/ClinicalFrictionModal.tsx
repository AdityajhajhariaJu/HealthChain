import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Fingerprint, Lock, CheckCircle2, Activity, X } from 'lucide-react';
import { triggerHapticHeavy, triggerHapticLight } from '../../services/haptics';

interface Props {
  isOpen: boolean;
  onComplete: () => void;
  title?: string;
}

export const ClinicalFrictionModal: React.FC<Props> = ({ isOpen, onComplete }) => {
  useEffect(() => {
    if (isOpen) {
      onComplete();
    }
  }, [isOpen, onComplete]);

  return null;
};
