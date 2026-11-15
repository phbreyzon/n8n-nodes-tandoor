# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-11-15

### Added
- Initial release of the `n8n-nodes-tandoor` community node.
- **Recipe** resource: get many, get, create, update and delete. Supports steps
  with nested ingredients, existing or find-or-create keywords, and nutrition.
- **Meal Plan** resource: get many, get, create, update, delete and auto-generate
  from keywords. Date-window listing filters out overlapping entries.
- **Food**, **Unit** and **Keyword** resources: list reference data with an
  optional name query.
- **Meal Type** resource: list available meal types.
- **Shopping List** resource: read the current shopping list.
- `tandoorApi` credential with a Bearer-token header and a credential test.
- Automatic pagination across Tandoor's 25-items-per-page default.
- Find-or-create for foods, units and keywords, including `plural_name` matching
  and a Spanish singular/plural heuristic for foods; created records are reported
  as `created_new` on recipe create/update.
- Nutrition is mirrored into the recipe Properties (Calories, Proteins, Fats,
  Carbohydrates) that the current Tandoor UI renders.

[Unreleased]: https://github.com/phbreyzon/n8n-nodes-tandoor/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/phbreyzon/n8n-nodes-tandoor/releases/tag/v0.1.0
