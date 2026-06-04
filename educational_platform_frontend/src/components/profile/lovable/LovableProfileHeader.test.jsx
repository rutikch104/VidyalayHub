import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import LovableProfileHeader from './LovableProfileHeader';

describe('LovableProfileHeader', () => {
  it('renders without throwing', () => {
    expect(() =>
      render(
        <LovableProfileHeader
          profileData={{
            name: 'Test User',
            joinedAt: '2026-04-01T00:00:00.000Z',
          }}
          resolvedHandle="@test"
          visitorMode={false}
          roles={['Student']}
          activeRole="Student"
          stats={{ posts: 0, followers: 0, following: 0, connections: 0 }}
        />,
      ),
    ).not.toThrow();
  });
});
