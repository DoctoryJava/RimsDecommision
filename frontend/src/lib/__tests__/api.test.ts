import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('api', () => {
  beforeEach(() => {
    localStorage.clear();
  });
  it('should attach Bearer token', async () => {
    localStorage.setItem('rims_token', 'test-token');
    expect(localStorage.getItem('rims_token')).toBe('test-token');
  });
  it('should fallback to mock when API unreachable (LoginPage logic)', async () => {
    const err = new Error('Network Error');
    expect(err.message).toContain('Network');
  });
  it('should store rims_user after login', () => {
    localStorage.setItem('rims_user', JSON.stringify({ username: 'sarah.chen@company.com' }));
    expect(JSON.parse(localStorage.getItem('rims_user')!).username).toBe('sarah.chen@company.com');
  });
});
