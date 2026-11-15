import { IAllExecuteFunctions, IDataObject } from 'n8n-workflow';

import { Food, FoundRef, Keyword, Paginated, Property, PropertyType, Recipe, Unit } from '../interfaces/types';
import { tandoorApiRequest, tandoorApiRequestAllItems } from './client';

/** Input shape for an ingredient as entered in the node UI. */
export interface IngredientInput {
  food: string;
  amount: number;
  unit?: string;
  note?: string;
}

/** Input shape for a recipe step as entered in the node UI. */
export interface StepInput {
  name?: string;
  instruction?: string;
  time?: number;
  ingredients?: IngredientInput[];
}

/**
 * Tandoor's current (Vue) UI does NOT render the legacy `Recipe.nutrition`
 * field. Recipe nutrition is displayed from the generic "Properties" system:
 * each nutrient is a Property whose property_type is one of the seeded types
 * below. We therefore mirror nutrition into both the legacy `nutrition` field
 * (kept for API compatibility) AND these Properties so the values show up.
 */
const NUTRIENT_PROPERTY_SLUGS: Record<string, string> = {
  calories: 'property-calories',
  proteins: 'property-proteins',
  fats: 'property-fats',
  carbohydrates: 'property-carbohydrates',
};

/** Normalize a free-text name for matching: trim, lowercase, collapse spaces. */
export function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Search for a keyword by name, or create it if it doesn't exist. */
export async function findOrCreateKeyword(ctx: IAllExecuteFunctions, name: string): Promise<FoundRef> {
  const normalized = normalizeName(name);
  const response = await tandoorApiRequest<Paginated<Keyword>>(ctx, {
    endpoint: '/api/keyword/',
    qs: { query: normalized, page_size: 100 },
  });

  const exactMatch = (response?.results ?? []).find((keyword) => normalizeName(keyword.name) === normalized);
  if (exactMatch) {
    return { id: exactMatch.id as number, name: exactMatch.name, created: false };
  }

  const created = await tandoorApiRequest<Keyword>(ctx, {
    method: 'POST',
    endpoint: '/api/keyword/',
    body: { name: name.trim() },
  });
  return { id: created.id as number, name: created.name, created: true };
}

/**
 * Search for a food by name, or create it if it doesn't exist.
 *
 * Matching is normalized and also checks `plural_name` plus a Spanish
 * singular/plural heuristic ("tomates" -> "tomate") so variant spellings reuse
 * existing foods instead of creating duplicates.
 */
export async function findOrCreateFood(ctx: IAllExecuteFunctions, name: string): Promise<FoundRef> {
  const normalized = normalizeName(name);
  const response = await tandoorApiRequest<Paginated<Food>>(ctx, {
    endpoint: '/api/food/',
    qs: { query: normalized, page_size: 100 },
  });

  const results: Food[] = response?.results ?? [];

  const matches = (food: Food, value: string) =>
    normalizeName(food.name) === value || (food.plural_name != null && normalizeName(food.plural_name) === value);

  const exactMatch = results.find((food) => matches(food, normalized));
  if (exactMatch) {
    return { id: exactMatch.id as number, name: exactMatch.name, created: false };
  }

  // Spanish singular/plural heuristic. Each variant gets its OWN query — the
  // original query may not match the variant (substring search).
  const variants: string[] = [];
  if (normalized.endsWith('s') && !normalized.endsWith('ss')) {
    variants.push(normalized.slice(0, -1));
  } else if (!normalized.endsWith('s')) {
    variants.push(`${normalized}s`);
  }

  for (const variant of variants) {
    const variantResponse = await tandoorApiRequest<Paginated<Food>>(ctx, {
      endpoint: '/api/food/',
      qs: { query: variant, page_size: 100 },
    });
    const variantMatch = (variantResponse?.results ?? []).find((food) => matches(food, variant));
    if (variantMatch) {
      return { id: variantMatch.id as number, name: variantMatch.name, created: false };
    }
  }

  const created = await tandoorApiRequest<Food>(ctx, {
    method: 'POST',
    endpoint: '/api/food/',
    body: { name: name.trim() },
  });
  return { id: created.id as number, name: created.name, created: true };
}

/**
 * Search for a unit by name, or create it if it doesn't exist.
 * Also checks `plural_name`. No singular/plural heuristic here — units are
 * short codes ("g", "gr") where guessing creates more noise than it removes.
 */
export async function findOrCreateUnit(ctx: IAllExecuteFunctions, name: string): Promise<FoundRef | null> {
  if (!name) {
    return null;
  }

  const normalized = normalizeName(name);
  const response = await tandoorApiRequest<Paginated<Unit>>(ctx, {
    endpoint: '/api/unit/',
    qs: { query: normalized, page_size: 100 },
  });

  const exactMatch = (response?.results ?? []).find(
    (unit) =>
      normalizeName(unit.name) === normalized ||
      (unit.plural_name != null && normalizeName(unit.plural_name) === normalized),
  );
  if (exactMatch) {
    return { id: exactMatch.id as number, name: exactMatch.name, created: false };
  }

  const created = await tandoorApiRequest<Unit>(ctx, {
    method: 'POST',
    endpoint: '/api/unit/',
    body: { name: name.trim() },
  });
  return { id: created.id as number, name: created.name, created: true };
}

export interface ProcessedIngredients {
  ingredients: IDataObject[];
  createdFoods: FoundRef[];
  createdUnits: FoundRef[];
}

/** Resolve every ingredient's food/unit to an existing record or create it. */
export async function processIngredients(
  ctx: IAllExecuteFunctions,
  ingredients: IngredientInput[],
): Promise<ProcessedIngredients> {
  const processedIngredients: IDataObject[] = [];
  const createdFoods: FoundRef[] = [];
  const createdUnits: FoundRef[] = [];

  for (let i = 0; i < ingredients.length; i++) {
    const ingredient = ingredients[i];

    const food = await findOrCreateFood(ctx, ingredient.food);
    if (food.created) {
      createdFoods.push(food);
    }

    const unit = ingredient.unit ? await findOrCreateUnit(ctx, ingredient.unit) : null;
    if (unit?.created) {
      createdUnits.push(unit);
    }

    processedIngredients.push({
      food: { id: food.id, name: food.name },
      unit: unit ? { id: unit.id, name: unit.name } : null,
      amount: ingredient.amount,
      note: ingredient.note,
      order: i,
      is_header: false,
      no_amount: false,
    });
  }

  return { ingredients: processedIngredients, createdFoods, createdUnits };
}

export interface ProcessedSteps {
  steps: IDataObject[];
  createdFoods: FoundRef[];
  createdUnits: FoundRef[];
}

/** Resolve every step (and its ingredients) for sending to Tandoor. */
export async function processSteps(ctx: IAllExecuteFunctions, steps: StepInput[]): Promise<ProcessedSteps> {
  const processedSteps: IDataObject[] = [];
  const createdFoods: FoundRef[] = [];
  const createdUnits: FoundRef[] = [];

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];

    const result = await processIngredients(ctx, step.ingredients ?? []);
    createdFoods.push(...result.createdFoods);
    createdUnits.push(...result.createdUnits);

    processedSteps.push({
      name: step.name ?? '',
      instruction: step.instruction ?? '',
      ingredients: result.ingredients,
      time: step.time ?? 0,
      order: i,
      show_as_header: false,
    });
  }

  return { steps: processedSteps, createdFoods, createdUnits };
}

export interface ProcessedKeywords {
  keywords: IDataObject[];
  createdKeywords: FoundRef[];
}

/** Resolve keyword names to existing records, creating missing ones. */
export async function processKeywords(ctx: IAllExecuteFunctions, keywordNames: string[]): Promise<ProcessedKeywords> {
  const keywords: IDataObject[] = [];
  const createdKeywords: FoundRef[] = [];

  for (const name of keywordNames) {
    const keyword = await findOrCreateKeyword(ctx, name);
    keywords.push({ id: keyword.id, name: keyword.name });
    if (keyword.created) {
      createdKeywords.push(keyword);
    }
  }

  return { keywords, createdKeywords };
}

/** Resolve the nutrient PropertyTypes that exist on the server. */
export async function resolveNutrientPropertyTypes(ctx: IAllExecuteFunctions): Promise<Record<string, PropertyType>> {
  const types = await tandoorApiRequestAllItems<PropertyType>(ctx, '/api/property-type/');
  const resolved: Record<string, PropertyType> = {};

  for (const [key, slug] of Object.entries(NUTRIENT_PROPERTY_SLUGS)) {
    const match =
      types.find((type) => type.open_data_slug === slug) ||
      types.find((type) => (type.name || '').toLowerCase() === key);
    if (match) {
      resolved[key] = match;
    }
  }

  return resolved;
}

/**
 * Merge nutrition values into a recipe's existing Property list.
 *
 * Tandoor replaces the whole `properties` relation on PATCH, so the caller
 * must send every property it wants to keep. Existing properties are passed
 * back verbatim (they carry an `id`, which makes Tandoor update in place
 * instead of creating duplicates).
 */
export function mergeNutritionProperties(
  existing: Property[],
  nutrition: Record<string, number | undefined>,
  nutrientTypes: Record<string, PropertyType>,
): Property[] {
  const result = [...(existing || [])];

  for (const [key, type] of Object.entries(nutrientTypes)) {
    const value = nutrition[key];
    if (value === undefined) {
      continue;
    }

    const existingProperty = result.find((property) => property?.property_type?.id === type.id);
    if (existingProperty) {
      existingProperty.property_amount = value;
    } else {
      result.push({
        property_amount: value,
        property_type: { id: type.id, name: type.name, unit: type.unit },
      });
    }
  }

  return result;
}

/** Remove the nutrient Properties from a recipe's property list. */
export function stripNutritionProperties(
  existing: Property[],
  nutrientTypes: Record<string, PropertyType>,
): Property[] {
  const ids = new Set(Object.values(nutrientTypes).map((type) => type.id));
  return (existing || []).filter(
    (property) => property?.property_type?.id == null || !ids.has(property.property_type.id),
  );
}

/** Fetch a single recipe by ID. */
export async function getRecipe(ctx: IAllExecuteFunctions, id: number): Promise<Recipe> {
  return tandoorApiRequest<Recipe>(ctx, { endpoint: `/api/recipe/${id}/` });
}
