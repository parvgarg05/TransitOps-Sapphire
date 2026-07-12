/**
 * Tests for session domain logic
 * 
 * **Validates: Requirements 1.7**
 */

import { describe, it, expect } from 'vitest';
import { isSessionExpired } from './session';

describe('isSessionExpired', () => {
  it('returns false when session is active (less than 30 minutes)', () => {
    const lastActivity = new Date('2024-01-01T12:00:00Z');
    const now = new Date('2024-01-01T12:29:59Z'); // 29 minutes 59 seconds
    
    expect(isSessionExpired(lastActivity, now)).toBe(false);
  });

  it('returns false when session is exactly at 30 minutes', () => {
    const lastActivity = new Date('2024-01-01T12:00:00Z');
    const now = new Date('2024-01-01T12:30:00Z'); // exactly 30 minutes
    
    expect(isSessionExpired(lastActivity, now)).toBe(false);
  });

  it('returns true when session exceeds 30 minutes', () => {
    const lastActivity = new Date('2024-01-01T12:00:00Z');
    const now = new Date('2024-01-01T12:30:01Z'); // 30 minutes 1 second
    
    expect(isSessionExpired(lastActivity, now)).toBe(true);
  });

  it('returns true when session is significantly expired', () => {
    const lastActivity = new Date('2024-01-01T12:00:00Z');
    const now = new Date('2024-01-01T13:00:00Z'); // 1 hour
    
    expect(isSessionExpired(lastActivity, now)).toBe(true);
  });

  it('handles edge case with zero elapsed time', () => {
    const lastActivity = new Date('2024-01-01T12:00:00Z');
    const now = new Date('2024-01-01T12:00:00Z'); // same time
    
    expect(isSessionExpired(lastActivity, now)).toBe(false);
  });

  it('handles dates with milliseconds precision', () => {
    const lastActivity = new Date('2024-01-01T12:00:00.000Z');
    const now = new Date('2024-01-01T12:30:00.001Z'); // 30 minutes and 1 millisecond
    
    expect(isSessionExpired(lastActivity, now)).toBe(true);
  });
});
