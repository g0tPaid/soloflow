const PRODUCTION_HOST = 'soloflow.practicalthings.store';

const OAUTH_HOSTS = new Set(['accounts.google.com', 'accounts.youtube.com']);

function isGoogleHost(hostname) {
  return (
    OAUTH_HOSTS.has(hostname) ||
    hostname.endsWith('.google.com') ||
    hostname.endsWith('.googleusercontent.com') ||
    hostname.endsWith('.gstatic.com')
  );
}

/**
 * Pages the desktop window may open. Everything else goes to the system browser.
 * @param {string} target
 * @param {string} appUrl
 */
function isAllowedNavigation(target, appUrl) {
  let next;
  let app;
  try {
    next = new URL(target);
    app = new URL(appUrl);
  } catch {
    return false;
  }

  if (next.protocol !== 'https:' && next.protocol !== 'http:') return false;

  if (next.host === app.host) {
    if (app.protocol === 'http:' && (app.hostname === 'localhost' || app.hostname === '127.0.0.1')) {
      return next.protocol === 'http:';
    }
    return next.protocol === 'https:' || next.protocol === app.protocol;
  }

  if (next.hostname === PRODUCTION_HOST) return next.protocol === 'https:';

  return next.protocol === 'https:' && isGoogleHost(next.hostname);
}

module.exports = { isAllowedNavigation, PRODUCTION_HOST };
