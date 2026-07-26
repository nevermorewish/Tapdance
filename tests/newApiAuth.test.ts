import test from 'node:test';
import assert from 'node:assert/strict';

import { isNewApiAuthenticated } from '../src/services/newApiAuth.ts';

test('NewAPI authentication requires a user and the selected active token', () => {
  const authenticated = {
    apiKey: 'sk-live',
    user: { id: 7, username: 'tester', displayName: 'Tester', email: '' },
    tokens: [{ id: 11, name: 'Tapdance', group: 'default', status: 1, key: 'sk-live' }],
    selectedTokenId: 11,
  };

  assert.equal(isNewApiAuthenticated(authenticated), true);
  assert.equal(isNewApiAuthenticated({ ...authenticated, user: null }), false);
  assert.equal(isNewApiAuthenticated({ ...authenticated, tokens: [] }), false);
  assert.equal(isNewApiAuthenticated({ ...authenticated, selectedTokenId: null }), false);
  assert.equal(isNewApiAuthenticated({ ...authenticated, apiKey: 'sk-stale' }), false);
  assert.equal(isNewApiAuthenticated({
    ...authenticated,
    tokens: [{ ...authenticated.tokens[0], status: 0 }],
  }), false);
});
