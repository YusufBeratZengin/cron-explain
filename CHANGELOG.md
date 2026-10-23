# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Reproducible terminal SVG demo, bilingual quick start and FAQ, native Node.js test coverage, and weekly CodeQL analysis.
- Weekly npm and GitHub Actions dependency updates.
- Warnings and JSON `neverMatches` for expressions with no future date through 2099; successful exit code remains 0.
- Regression tests for Quartz nth/last weekdays, impossible dates, sparse schedules, and DST skip behavior.
- Trusted npm publishing workflow triggered by version tags, with provenance and a tag/version check.
- Bug and feature issue forms, pull request template, and Contributor Covenant 2.1.
- Offline basic and Quartz examples, exercised in CI.
- CI and MIT badges, bilingual exit-code documentation, and executable README output checks in lint.

### Changed

- Search calendar fields through the supported year 2099, including distant explicit years.
- Restrict npm payload to runtime files, locale JSON, and selected documentation; add public provenance and prepublish checks.
- Normalize the author name and use private GitHub security advisories for vulnerability reporting.
- Add `on` to English weekday phrases and shorten six-day sets to a single excluded day in both languages.
- Use `Hafta içi her gün` for exactly Monday–Friday and `09:00 ile 17:59 arasında` for Turkish hour ranges.
- Reject invalid CLI options with one English error line, including noninteger/negative counts and counts above 1000.
- Expand CI to Node 20, 22, and 24 on Windows and Linux, with package payload checks.

### Fixed

- Pass year and month into weekday matching so Quartz `<day>#<nth>` schedules no longer throw `year is not defined`.
- Avoid silently accepting invalid language, date, format, DST policy, or truncated numeric CLI values.
- Replace stale README outputs with real runs from fixed start dates and natural Turkish explanations.

## [0.1.0] - 2026-10-23

### Added
- Core parser supporting 5-field (Unix), 6-field (seconds or year), and 7-field (Quartz) expressions.
- Support for Quartz special characters: `?`, `L`, `LW`, `L-<offset>`, `<day>W`, `<day>L`, and `<day>#<nth>`.
- Standard cron aliases: `@yearly`, `@annually`, `@monthly`, `@weekly`, `@daily`, `@midnight`, `@hourly`, and `@reboot`.
- Human-readable explanations in English and Turkish via locale files (`locales/en.json`, `locales/tr.json`).
- Dedicated Turkish grammar helper functions for vowel harmony and consonant assimilation on ordinal and locative suffixes.
- Next N run times calculation using native ECMAScript `Intl` time zones with zero runtime dependencies.
- Deterministic DST policy handling spring-forward gaps (shift to boundary or skip) and fall-back overlaps (first occurrence disambiguation).
- Leap year calculation ensuring February 29 expressions only match in valid leap years.
- Validation errors with visual ASCII position pointers and error details.
- Command-line interface `cron-explain` supporting `--next`, `--tz`, `--lang`, `--format json`, and `--dst`.
- Automated GitHub Actions CI workflow running tests and syntax checks on Node 20 and 22 across Ubuntu and Windows.
