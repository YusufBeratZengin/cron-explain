# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-10-22

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
