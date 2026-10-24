# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- AWS EventBridge `cron(...)` and explicit `eventbridge` dialect: six minute-through-year fields, required `?`, Sunday-based weekday numbering, and years through 2199.
- German and Spanish locale JSON, explanations and CLI labels (`--lang de|es`).
- `diff` command and `compareSchedules` API showing the next N distinct instants as A-only, B-only or shared, with optional `--days` window and JSON output.
- `--calendar`, `getCalendar` and `renderCalendar` for exact next-N run counts in Monday-first month grids, including sparse schedules, local dates and JSON.
- `findOverlaps` API for bounded shared-run counting, plus explicit `--type auto|unix|quartz|eventbridge` selection.
- Feature and CLI regression tests and bilingual documentation for dialects, languages, comparison and calendars.
- Reproducible terminal SVG demo, bilingual quick start and FAQ, native Node.js test coverage, and weekly CodeQL analysis.
- Weekly npm and GitHub Actions dependency updates.
- Warnings and JSON `neverMatches` for expressions with no future date through the supported final year (2099; 2199 for EventBridge); successful exit code remains 0.
- Regression tests for Quartz nth/last weekdays, impossible dates, sparse schedules, and DST skip behavior.
- Trusted npm publishing workflow triggered by version tags, with provenance and a tag/version check.
- Bug and feature issue forms, pull request template, and Contributor Covenant 2.1.
- Offline basic and Quartz examples, exercised in CI.
- CI and MIT badges, bilingual exit-code documentation, and executable README output checks in lint.

### Changed

- Search calendar fields through the dialect's supported final year, including distant explicit years.
- Restrict npm payload to runtime files, locale JSON, and selected documentation; add public provenance and prepublish checks.
- Normalize the author name and use private GitHub security advisories for vulnerability reporting.
- Add `on` to English weekday phrases and shorten six-day sets to a single excluded day in both languages.
- Use `Hafta içi her gün` for exactly Monday–Friday and `09:00 ile 17:59 arasında` for Turkish hour ranges.
- Reject invalid CLI options with one English error line, including noninteger/negative counts and counts above 1000.
- Expand CI to Node 20, 22, and 24 on Windows and Linux, with package payload checks.

### Fixed

- Detect Quartz specials in day fields without treating Unix month/day names such as `JUL` and `WED` as Quartz syntax.
- Accept lowercase Quartz L/W/# specials, use the correct Quartz wildcard weekday range, skip nonexistent dates for `W`, and honor zero schedule counts and numeric epoch starts.
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
