# Contributing to cron-explain

Thank you for your interest in contributing to `cron-explain`.

## Development Setup

Requirements:
- Node.js >= 20.0.0
- npm >= 9.0.0

Clone repository:
```bash
git clone https://github.com/YusufBeratZengin/cron-explain.git
cd cron-explain
```

Install dependencies:
The project has zero runtime dependencies and zero dev dependencies. Node.js built-ins (`node:test`, `node:assert`, `node:child_process`, `Intl`) are used exclusively.

## Running Tests and Lint

Run tests:
```bash
npm test
```

Run syntax, style, and executable README checks:
```bash
npm run lint
```

Run both offline examples and inspect the package payload:
```bash
node examples/basic.mjs
node examples/quartz.mjs
npm pack --dry-run
```

`scripts/check-readme.js` verifies every marked command/output pair in both
READMEs. CLI examples must include an explicit `--start` and `--tz` so the
output stays reproducible. Keep the two documents in sync.

## Guidelines

- Keep the package zero runtime dependencies. Do not add third-party dependencies to `dependencies` in `package.json`.
- Preserve full ECMAScript Modules (ESM) compliance.
- Write tests in `test/` using the native `node:test` and `node:assert/strict` test runners.
- When adding or modifying Turkish language rules, ensure tests cover vowel harmony and consonant assimilation in `test/grammar-tr.test.js`.
- Use Conventional Commits formatting for commit messages (e.g. `feat:`, `fix:`, `test:`, `docs:`).
- Avoid emojis in commit messages, pull requests, and documentation.

## Submitting Pull Requests

1. Fork the repository on GitHub: `https://github.com/YusufBeratZengin/cron-explain`.
2. Create a feature branch: `git checkout -b feat/my-feature`.
3. Commit your changes with descriptive Conventional Commits.
4. Verify that all tests pass (`npm test`) and syntax validation passes (`npm run lint`).
5. Open a pull request against the `main` branch.

## Releasing

The owner must first configure an npm trusted publisher on npmjs.com for
`YusufBeratZengin/cron-explain`, workflow filename `release.yml`, and the
GitHub environment `npm`. Create that environment in the repository too.
The workflow uses Node 24 and npm's OIDC trusted publishing; no npm token
secret is needed.

1. Update the Unreleased section in CHANGELOG.md and choose a SemVer version.
2. Update package.json and package-lock.json to that version and date the changelog entry.
3. Run `npm run lint`, `npm test`, both examples, and `npm pack --dry-run`.
4. Commit with `chore(release): vX.Y.Z`, then create the matching `vX.Y.Z` tag.
5. When ready to publish, push the tag. The release workflow checks the tag
   against package.json, runs lint and tests, then publishes with provenance
   and public access.

Publishing is performed only by the tag workflow after the owner configures
the trusted publisher. Do not publish manually during a development pass.
