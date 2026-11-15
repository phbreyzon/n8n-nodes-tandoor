# n8n-nodes-tandoor

An [n8n](https://n8n.io/) community node for [Tandoor Recipes](https://tandoor.dev/).
It lets workflows manage recipes, meal plans, foods, units, keywords and the
shopping list through the Tandoor REST API.

## Features

- **Recipes** — list, get, create, update and delete. Steps and ingredients are
  written as nested objects.
- **Meal plans** — list, get, create, update, delete and auto-generate from
  keywords.
- **Lookups** — list foods, units, keywords and meal types; read the shopping
  list.
- **Find or create** — foods, units and keywords referenced by name are matched
  against existing records (including `plural_name` and a Spanish
  singular/plural heuristic for foods) and only created when no match exists.
  The node reports which records were newly created.
- **Nutrition mirroring** — nutrition values are written to both the legacy
  `nutrition` field and the recipe *Properties* that the current Tandoor UI
  actually renders (Calories, Proteins, Fats, Carbohydrates).
- **Auto-pagination** — Tandoor returns 25 items per page; the node follows the
  `next` link until every page has been fetched.
- **Usable as a tool** — the node can be attached to an AI Agent as a tool.

## Requirements

- n8n (self-hosted or cloud) with community nodes enabled.
- A reachable Tandoor Recipes instance.
- An API token for your Tandoor user.

## Installation

In n8n, open **Settings → Community Nodes**, choose **Install**, and enter
`n8n-nodes-tandoor`.

Manually, on a self-hosted instance:

```bash
mkdir -p ~/.n8n/nodes && cd ~/.n8n/nodes
npm install n8n-nodes-tandoor
# restart n8n afterwards
```

## Credentials

Create an API token in Tandoor under **Settings → API Tokens**, then add a
**Tandoor API** credential in n8n:

| Field | Value |
| --- | --- |
| Base URL | `https://tandoor.example.com` (no trailing slash, no `/api`) |
| API Token | the token you created in Tandoor |

The credential injects an `Authorization: Bearer <token>` header on every
request. The credential test performs a `GET /api/meal-type/`.

## Resources and operations

### Recipe

| Operation | Description |
| --- | --- |
| Get Many | List recipes with optional query, keyword, minimum-rating and sort filters |
| Get | Fetch a single recipe by ID |
| Create | Create a recipe with steps, ingredients, keywords and nutrition |
| Update | Change fields, replace steps/keywords, or set/clear nutrition |
| Delete | Permanently delete a recipe |

Steps are entered as a fixed collection; each step can contain any number of
ingredients. Ingredient **Food** and **Unit** values are free text — the node
matches them to existing records or creates them.

Keywords can be selected from existing keywords (loaded from your instance) or
typed as new names to find-or-create.

On **Update**, providing steps replaces the entire steps array — include every
step you want to keep.

### Meal Plan

| Operation | Description |
| --- | --- |
| Get Many | List meal plans, optionally filtered by date window and meal type |
| Get | Fetch a single meal plan by ID |
| Create | Schedule a recipe or free-text title for a date |
| Update | Change the recipe, title, servings, dates, meal type or note |
| Delete | Delete a meal plan entry |
| Auto Generate | Generate meals for a date range from selected keywords |

When a date window is supplied to **Get Many**, only entries whose `from_date`
falls inside the window are returned. Tandoor itself returns entries that merely
*overlap* the window; the node filters those out so the result matches "the plan
for this week".

### Food / Unit / Keyword

List the reference data (with an optional name query) used as ingredients and
tags.

### Meal Type

List the available meal types (breakfast, lunch, dinner, ...).

### Shopping List

Read the current shopping list entries.

## Notes on returned data

The node returns the raw Tandoor API objects, so every field the API provides is
available downstream. On **Create** and **Update** of a recipe, an extra
`created_new` array and a `warning` string are added when foods, units or
keywords had to be created — useful for spotting accidental duplicates.

## Development

```bash
npm install      # install dependencies
npm run build    # compile TypeScript and copy icons to dist/
npm run dev      # compile in watch mode
npm run lint     # run ESLint
npm run format   # format with Prettier
```

## License

[MIT](LICENSE.md)
