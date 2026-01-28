import { describe, it, expect } from 'vitest';
import { parseDelegationNextStep } from './responseParser';

describe('responseParser - delegation', () => {
  it('parses @target: delegation requests', () => {
    const result = parseDelegationNextStep('@morpheum: Build the thing');
    expect(result).toEqual({ target: 'morpheum', task: 'Build the thing' });
  });

  it('returns null when no delegation marker exists', () => {
    const result = parseDelegationNextStep('Run tests and report.');
    expect(result).toBeNull();
  });

  it('extracts delegation from multi-line next step', () => {
    const result = parseDelegationNextStep('First do setup\n@reviewer: Review the spec');
    expect(result).toEqual({ target: 'reviewer', task: 'Review the spec' });
  });
});
