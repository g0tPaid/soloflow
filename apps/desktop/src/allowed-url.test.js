const test = require('node:test');
const assert = require('node:assert/strict');
const { isAllowedNavigation } = require('./allowed-url');

const APP = 'https://soloflow.practicalthings.store';

test('allows quote and invoice pages on the billing site', () => {
  assert.equal(isAllowedNavigation('https://soloflow.practicalthings.store/quotes', APP), true);
  assert.equal(isAllowedNavigation('https://soloflow.practicalthings.store/invoices/inv_1', APP), true);
});

test('allows Google sign-in and blocks other sites', () => {
  assert.equal(isAllowedNavigation('https://accounts.google.com/o/oauth2/v2/auth', APP), true);
  assert.equal(isAllowedNavigation('https://evil.example/quotes', APP), false);
  assert.equal(isAllowedNavigation('javascript:alert(1)', APP), false);
  assert.equal(isAllowedNavigation('file:///etc/passwd', APP), false);
});

test('allows a local billing server only when the app is pointed at it', () => {
  const local = 'http://localhost:3000';
  assert.equal(isAllowedNavigation('http://localhost:3000/dashboard', local), true);
  assert.equal(isAllowedNavigation('http://localhost:3000/dashboard', APP), false);
  assert.equal(isAllowedNavigation('https://soloflow.practicalthings.store/', local), true);
});
