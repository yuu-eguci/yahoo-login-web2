yahoo-login-web2
===

A small login authentication sample using Yahoo! ID 連携. Wanted to say "small" though it has became so complicated. It works on GCP - App Engine.

![](media/media.png)

## Requirements

- Node.js 24.12 or later (Node.js 26 LTS is recommended). The server code is TypeScript and runs directly with Node.js' built-in type stripping, so there is no build step.

## Installation

```bash
npm ci
npm start
```

The app listens on `PORT` (default `3000`).

## Environment variables

| Name | Required | Description |
|---|---|---|
| `YAHOO_CLIENT_ID` | yes | Client ID of your Yahoo! ID 連携 application. |
| `YAHOO_CLIENT_SECRET` | yes | Client secret of your Yahoo! ID 連携 application. |
| `SESSION_MAX_AGE_MS` | no | Session cookie lifetime in milliseconds. When unset, the cookie lasts for the browser session. |
| `PORT` | no | Listening port. Default `3000`. |
| `YAHOO_AUTH_ORIGIN` | no | Origin of the Yahoo authorization server. Default `https://auth.login.yahoo.co.jp`. Override only for local testing with a mock. |
| `YAHOO_USERINFO_ORIGIN` | no | Origin of the Yahoo UserInfo API. Default `https://userinfo.yahooapis.jp`. Override only for local testing with a mock. |

### env_variables.yaml (App Engine)

App Engine reads environment variables from env_variables.yaml, which `app.yaml` includes. Create it manually; it is gitignored so that credentials are never committed.

```yaml
# Not let git to include environment variables.
# Separate them from app.yaml and gitignore them.
env_variables:
  YAHOO_CLIENT_ID: '<your client id>'
  YAHOO_CLIENT_SECRET: '<your client secret>'
  SESSION_MAX_AGE_MS: 60000
```

## Development

```bash
npm run typecheck  # tsc (strict, no emit)
npm test           # node:test against a local mock of the Yahoo endpoints
npm run check      # both of the above
```

Tests never contact real Yahoo services; `test/support/mock-yahoo.ts` serves synthetic responses.

## Illustrate implemented authorization code grant flow

Below.

![](media/media2.png)
