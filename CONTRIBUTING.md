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

Run syntax verification:
```bash
npm run lint
```

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
