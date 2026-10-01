// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { HeartPulse } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';
import { CalmApothecaryCapsule, CalmBadge } from './CalmApothecaryCapsule';

describe('CalmApothecaryCapsule', () => {
  it('renders label and subtitle properly', () => {
    render(
      <CalmApothecaryCapsule
        label="Hypertension"
        subtitle="Cardiovascular"
        category="cardio"
        icon={HeartPulse}
      />
    );
    expect(screen.getByText('Hypertension')).toBeTruthy();
    expect(screen.getByText('Cardiovascular')).toBeTruthy();
  });

  it('triggers onClick callback when tapped', () => {
    const handleClick = vi.fn();
    render(<CalmApothecaryCapsule label="Metformin" category="medication" onClick={handleClick} />);
    fireEvent.click(screen.getByRole('button', { name: 'Metformin' }));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('shows checkmark when isSelected is true', () => {
    const { container } = render(
      <CalmApothecaryCapsule label="Fatigue" category="systemic" isSelected={true} />
    );
    expect(screen.getByRole('button', { name: 'Fatigue' }).getAttribute('aria-pressed')).toBe(
      'true'
    );
    // Check svg inside checkmark circle
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('triggers onRemove callback when remove button is clicked', () => {
    const handleRemove = vi.fn();
    render(
      <CalmApothecaryCapsule label="Penicillin" category="immune_allergy" onRemove={handleRemove} />
    );
    const removeBtn = screen.getByRole('button', { name: 'Remove Penicillin' });
    fireEvent.click(removeBtn);
    expect(handleRemove).toHaveBeenCalledTimes(1);
  });
});

describe('CalmBadge', () => {
  it('renders with string emoji or icon component', () => {
    render(<CalmBadge icon="⚡" category="neuro" size={24} />);
    expect(screen.getByText('⚡')).toBeTruthy();
  });
});
