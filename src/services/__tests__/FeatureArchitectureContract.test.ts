import { describe, it, expect } from 'vitest';
import {
  FEATURE_CONTRACTS,
  FeatureId,
  getFeatureContract,
  getAllFeatureContracts,
  getDownstreamHandoffs,
  getUpstreamFeeds,
  isPermissiblePipelineHandoff,
} from '../FeatureArchitectureContract';

describe('FeatureArchitectureContract (Step 2: Distinct Purposes)', () => {
  const EXPECTED_FEATURE_IDS: FeatureId[] = [
    'ava',
    'engine',
    'connection-detective',
    'canvas',
    'cases',
    'case-prep',
    'medicine-labs',
    'diet-plan',
    'food-detective',
    'elimination-suite',
    'clinical-trials',
    'zen-garden',
  ];

  it('contains exactly the 12 canonical features defined in the architecture specification', () => {
    const contracts = getAllFeatureContracts();
    expect(contracts).toHaveLength(12);

    const actualIds = contracts.map((c) => c.id);
    for (const expectedId of EXPECTED_FEATURE_IDS) {
      expect(actualIds).toContain(expectedId);
    }
  });

  it('verifies exact verbatim driving questions from reference specification', () => {
    expect(getFeatureContract('ava').uniqueQuestion).toBe(
      'Help me describe this and understand my next step.'
    );
    expect(getFeatureContract('engine').uniqueQuestion).toBe(
      'What does all this evidence suggest together?'
    );
    expect(getFeatureContract('connection-detective').uniqueQuestion).toBe(
      'Why are these things connected?'
    );
    expect(getFeatureContract('canvas').uniqueQuestion).toBe(
      'What happened, what is open, and what changed?'
    );
    expect(getFeatureContract('cases').uniqueQuestion).toBe(
      'Where is the complete history of this issue?'
    );
    expect(getFeatureContract('case-prep').uniqueQuestion).toBe(
      'What should I bring and ask?'
    );
    expect(getFeatureContract('medicine-labs').uniqueQuestion).toBe(
      'What does this original item contain?'
    );
    expect(getFeatureContract('diet-plan').uniqueQuestion).toBe(
      'What can I realistically eat?'
    );
    expect(getFeatureContract('food-detective').uniqueQuestion).toBe(
      'What patterns occur in my food logs?'
    );
    expect(getFeatureContract('elimination-suite').uniqueQuestion).toBe(
      'How do I follow and document this selected plan?'
    );
    expect(getFeatureContract('clinical-trials').uniqueQuestion).toBe(
      'What relevant research can I investigate?'
    );
    expect(getFeatureContract('zen-garden').uniqueQuestion).toBe(
      'How do I take a worthwhile break?'
    );
  });

  it('verifies distinct ownership boundaries with zero identical scopes', () => {
    const contracts = getAllFeatureContracts();
    const ownerships = contracts.map((c) => c.owns.toLowerCase().trim());
    const uniqueOwnerships = new Set(ownerships);

    expect(uniqueOwnerships.size).toBe(12);
  });

  it('verifies distinct unique questions with zero duplication across the suite', () => {
    const contracts = getAllFeatureContracts();
    const questions = contracts.map((c) => c.uniqueQuestion.toLowerCase().trim());
    const uniqueQuestions = new Set(questions);

    expect(uniqueQuestions.size).toBe(12);
  });

  it('enforces non-duplication rules for all 12 features', () => {
    expect(getFeatureContract('ava').mustNotDuplicate).toBe(
      'A separate competing clinical report'
    );
    expect(getFeatureContract('engine').mustNotDuplicate).toBe(
      'Day-to-day logging or a decorative specialist chat'
    );
    expect(getFeatureContract('connection-detective').mustNotDuplicate).toBe(
      'Another independently generated diagnosis list'
    );
    expect(getFeatureContract('canvas').mustNotDuplicate).toBe(
      'Simulated specialist discussion after every post'
    );
    expect(getFeatureContract('cases').mustNotDuplicate).toBe(
      'Another interpretation engine'
    );
    expect(getFeatureContract('case-prep').mustNotDuplicate).toBe(
      'An entirely new assessment'
    );
    expect(getFeatureContract('medicine-labs').mustNotDuplicate).toBe(
      'Cross-case conclusions'
    );
    expect(getFeatureContract('diet-plan').mustNotDuplicate).toBe(
      'Food-trigger investigation'
    );
    expect(getFeatureContract('food-detective').mustNotDuplicate).toBe(
      'Broad cross-system reasoning'
    );
    expect(getFeatureContract('elimination-suite').mustNotDuplicate).toBe(
      'Automatically deciding what caused symptoms'
    );
    expect(getFeatureContract('clinical-trials').mustNotDuplicate).toBe(
      'Eligibility determination'
    );
    expect(getFeatureContract('zen-garden').mustNotDuplicate).toBe(
      'Clinical interpretation'
    );
  });

  it('validates the complete unidirectional pipeline flow', () => {
    // 1. Intake -> Storage (My Cases)
    expect(isPermissiblePipelineHandoff('ava', 'cases')).toBe(true);
    expect(isPermissiblePipelineHandoff('medicine-labs', 'cases')).toBe(true);

    // 2. Storage -> Synthesis (Clinical Data Engine)
    expect(isPermissiblePipelineHandoff('cases', 'engine')).toBe(true);

    // 3. External Research -> Synthesis (Clinical Data Engine)
    expect(isPermissiblePipelineHandoff('clinical-trials', 'engine')).toBe(true);

    // 4. Synthesis -> Exploration (Connection Detective) & Prep (Case Prep)
    expect(isPermissiblePipelineHandoff('engine', 'connection-detective')).toBe(true);
    expect(isPermissiblePipelineHandoff('engine', 'case-prep')).toBe(true);

    // 5. Exploration -> Prep (Connection Detective -> Case Prep)
    expect(isPermissiblePipelineHandoff('connection-detective', 'case-prep')).toBe(true);

    // 6. Prep -> Outcome (Case Prep -> Health Canvas)
    expect(isPermissiblePipelineHandoff('case-prep', 'canvas')).toBe(true);

    // 7. Outcome -> Storage Closed Loop (Health Canvas -> My Cases)
    expect(isPermissiblePipelineHandoff('canvas', 'cases')).toBe(true);

    // 8. Invalid reverse / illegal leaps are prohibited
    expect(isPermissiblePipelineHandoff('canvas', 'engine')).toBe(false);
    expect(isPermissiblePipelineHandoff('medicine-labs', 'connection-detective')).toBe(false);
    expect(isPermissiblePipelineHandoff('zen-garden', 'engine')).toBe(false);
  });

  it('throws an error for unknown feature IDs', () => {
    expect(() => getFeatureContract('non_existent' as any)).toThrow(
      /Unknown feature id/
    );
  });
});
