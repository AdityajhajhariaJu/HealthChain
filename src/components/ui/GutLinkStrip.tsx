import React from 'react';
import { ArrowRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import './GutLinkStrip.css';

export interface GutLinkItem {
  label: string;
  value: string;
  detail?: string;
  icon: LucideIcon;
  tone: 'rose' | 'violet' | 'blue' | 'amber';
  onClick?: () => void;
}

export const GutLinkStrip: React.FC<{ label: string; items: GutLinkItem[]; compact?: boolean }> = ({ label, items, compact = false }) => <div className={`gr-link-strip${compact ? ' gr-link-strip-compact' : ''}`} aria-label={label}>
  {items.map((item, index) => {
    const Icon = item.icon;
    const content = <><span className={`gr-link-strip-icon gr-link-strip-${item.tone}`}><Icon size={19} aria-hidden="true" /></span><span className="gr-link-strip-copy"><small>{item.label}</small><strong>{item.value}</strong>{item.detail && <span>{item.detail}</span>}</span>{item.onClick && <ArrowRight className="gr-link-strip-arrow" size={16} aria-hidden="true" />}</>;
    return <React.Fragment key={`${item.label}-${index}`}>
      {index > 0 && <span className="gr-link-strip-join" aria-hidden="true" />}
      {item.onClick ? <button type="button" className="gr-link-strip-node" onClick={item.onClick}>{content}</button> : <div className="gr-link-strip-node">{content}</div>}
    </React.Fragment>;
  })}
</div>;
