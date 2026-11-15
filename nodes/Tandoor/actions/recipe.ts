import { IAllExecuteFunctions, IDataObject } from 'n8n-workflow';

import { FoundRef } from '../interfaces/types';
import { tandoorApiRequest, tandoorApiRequestAllItems } from '../helpers/client';
import {
  ProcessedKeywords,
  ProcessedSteps,
  getRecipe,
  mergeNutritionProperties,
  processKeywords,
  processSteps,
  resolveNutrientPropertyTypes,
  stripNutritionProperties,
  StepInput,
} from '../helpers/recipe';

export interface NutritionInput {
  calories?: number;
  carbohydrates?: number;
  fats?: number;
  proteins?: number;
  source?: string;
}

export interface ListRecipesParams {
  returnAll: boolean;
  limit?: number;
  query?: string;
  keywords?: number[];
  ratingGte?: number;
  sortOrder?: string;
}

export interface CreateRecipeParams {
  name: string;
  description?: string;
  servings?: number;
  servingsText?: string;
  workingTime?: number;
  waitingTime?: number;
  sourceUrl?: string;
  /** IDs of existing keywords to tag the recipe with. */
  keywords?: number[];
  /** Names of keywords to find or create. */
  newKeywords?: string[];
  internal?: boolean;
  private?: boolean;
  showIngredientOverview?: boolean;
  steps: StepInput[];
}

export interface UpdateRecipeParams {
  id: number;
  name?: string;
  description?: string;
  servings?: number;
  servingsText?: string;
  workingTime?: number;
  waitingTime?: number;
  sourceUrl?: string;
  /** IDs of existing keywords to tag the recipe with (replaces all keywords). */
  keywords?: number[];
  /** Names of keywords to find or create. */
  newKeywords?: string[];
  internal?: boolean;
  private?: boolean;
  showIngredientOverview?: boolean;
  steps?: StepInput[];
  /** `null` clears all nutrition information. */
  nutrition?: NutritionInput | null;
}

/**
 * Combine already-selected keyword IDs with names that still need to be
 * resolved (or created). Tandoor's nested write accepts `{ id }` for existing
 * records and `{ name }` for new ones.
 */
async function buildKeywords(
  ctx: IAllExecuteFunctions,
  keywordIds: number[] | undefined,
  keywordNames: string[] | undefined,
): Promise<ProcessedKeywords> {
  const keywords: IDataObject[] = (keywordIds ?? []).map((id) => ({ id }));
  let createdKeywords: FoundRef[] = [];

  if (keywordNames && keywordNames.length > 0) {
    const processed = await processKeywords(ctx, keywordNames);
    keywords.push(...processed.keywords);
    createdKeywords = processed.createdKeywords;
  }

  return { keywords, createdKeywords };
}

/** Fetch recipes, auto-paginating past Tandoor's 25/page default. */
export async function listRecipes(ctx: IAllExecuteFunctions, params: ListRecipesParams): Promise<IDataObject[]> {
  const qs: IDataObject = {};

  if (params.query) {
    qs.query = params.query;
  }
  if (params.keywords && params.keywords.length > 0) {
    qs.keywords = params.keywords;
  }
  if (params.ratingGte !== undefined && params.ratingGte !== null) {
    qs.rating_gte = params.ratingGte;
  }
  if (params.sortOrder) {
    qs.sort_order = params.sortOrder;
  }

  const limit = params.returnAll ? 0 : (params.limit ?? 50);
  return tandoorApiRequestAllItems(ctx, '/api/recipe/', qs, limit);
}

/** Fetch a single recipe. */
export async function getRecipeById(ctx: IAllExecuteFunctions, id: number): Promise<IDataObject> {
  return getRecipe(ctx, id);
}

/**
 * Build the `created_new` / `warning` metadata that tells the caller which
 * foods, units and keywords had to be created. Reusing existing records
 * avoids duplicates, so surfacing this is genuinely useful.
 */
function buildCreatedMetadata(steps: ProcessedSteps, keywords: ProcessedKeywords): IDataObject {
  const createdRefs: string[] = [];
  for (const food of steps.createdFoods) {
    createdRefs.push(`food "${food.name}"`);
  }
  for (const unit of steps.createdUnits) {
    createdRefs.push(`unit "${unit.name}"`);
  }
  for (const keyword of keywords.createdKeywords) {
    createdRefs.push(`keyword "${keyword.name}"`);
  }

  if (createdRefs.length === 0) {
    return {};
  }

  return {
    created_new: createdRefs,
    warning:
      'New records were created in Tandoor. If any of these names look like duplicates of existing entries, reuse the existing one instead.',
  };
}

/** Create a recipe, resolving/creating foods, units and keywords as needed. */
export async function createRecipe(ctx: IAllExecuteFunctions, params: CreateRecipeParams): Promise<IDataObject> {
  const stepsResult = await processSteps(ctx, params.steps ?? []);
  const keywordsResult = await buildKeywords(ctx, params.keywords, params.newKeywords);

  const recipe: IDataObject = {
    name: params.name,
    description: params.description,
    servings: params.servings,
    servings_text: params.servingsText,
    working_time: params.workingTime ?? 0,
    waiting_time: params.waitingTime ?? 0,
    source_url: params.sourceUrl,
    keywords: keywordsResult.keywords,
    steps: stepsResult.steps,
    // Recipes must be visible in the UI: `internal: true` hides them from
    // the default recipe list. Default to false.
    internal: params.internal === true,
    show_ingredient_overview: params.showIngredientOverview !== false,
    private: params.private ?? false,
  };

  const created = await tandoorApiRequest(ctx, {
    method: 'POST',
    endpoint: '/api/recipe/',
    body: recipe,
  });

  return {
    recipe: created,
    ...buildCreatedMetadata(stepsResult, keywordsResult),
  };
}

/**
 * Update a recipe. Only the provided fields are changed.
 *
 * NOTE: providing `steps` REPLACES the entire steps array — include every step.
 * Nutrition is written both to Tandoor's `nutrition` field and to the recipe
 * Properties (Calories/Proteins/Fats/Carbohydrates) that the UI displays.
 */
export async function updateRecipe(ctx: IAllExecuteFunctions, params: UpdateRecipeParams): Promise<IDataObject> {
  const { id, ...update } = params;
  const updates: IDataObject = {};

  if (update.name !== undefined) updates.name = update.name;
  if (update.description !== undefined) updates.description = update.description;
  if (update.servings !== undefined) updates.servings = update.servings;
  if (update.servingsText !== undefined) updates.servings_text = update.servingsText;
  if (update.workingTime !== undefined) updates.working_time = update.workingTime;
  if (update.waitingTime !== undefined) updates.waiting_time = update.waitingTime;
  if (update.sourceUrl !== undefined) updates.source_url = update.sourceUrl;
  if (update.internal !== undefined) updates.internal = !!update.internal;
  if (update.showIngredientOverview !== undefined) {
    updates.show_ingredient_overview = update.showIngredientOverview;
  }
  if (update.private !== undefined) updates.private = update.private;

  let stepsResult: ProcessedSteps = { steps: [], createdFoods: [], createdUnits: [] };
  let keywordsResult: ProcessedKeywords = { keywords: [], createdKeywords: [] };

  if (update.steps) {
    stepsResult = await processSteps(ctx, update.steps);
    updates.steps = stepsResult.steps;
  }

  if (update.keywords !== undefined || update.newKeywords !== undefined) {
    keywordsResult = await buildKeywords(ctx, update.keywords, update.newKeywords);
    updates.keywords = keywordsResult.keywords;
  }

  if (update.nutrition === null) {
    // Clear nutrition: null out the legacy field and drop the Properties.
    updates.nutrition = null;
    const recipe = await getRecipe(ctx, id);
    const nutrientTypes = await resolveNutrientPropertyTypes(ctx);
    updates.properties = stripNutritionProperties(recipe.properties ?? [], nutrientTypes);
  } else if (update.nutrition !== undefined) {
    const nutrition = update.nutrition;
    const recipe = await getRecipe(ctx, id);
    const existing = recipe.nutrition;

    // Tandoor's nested NutritionInformation serializer requires all four
    // values, so merge over the existing ones (falling back to 0).
    updates.nutrition = {
      calories: nutrition.calories ?? existing?.calories ?? 0,
      carbohydrates: nutrition.carbohydrates ?? existing?.carbohydrates ?? 0,
      fats: nutrition.fats ?? existing?.fats ?? 0,
      proteins: nutrition.proteins ?? existing?.proteins ?? 0,
      source: nutrition.source !== undefined ? nutrition.source : (existing?.source ?? undefined),
    };

    const nutrientTypes = await resolveNutrientPropertyTypes(ctx);
    if (Object.keys(nutrientTypes).length > 0) {
      const nutritionValues: Record<string, number | undefined> = {
        calories: nutrition.calories,
        carbohydrates: nutrition.carbohydrates,
        fats: nutrition.fats,
        proteins: nutrition.proteins,
      };
      updates.properties = mergeNutritionProperties(recipe.properties ?? [], nutritionValues, nutrientTypes);
    }
  }

  const updated = await tandoorApiRequest(ctx, {
    method: 'PATCH',
    endpoint: `/api/recipe/${id}/`,
    body: updates,
  });

  return {
    recipe: updated,
    ...buildCreatedMetadata(stepsResult, keywordsResult),
  };
}

/** Permanently delete a recipe. */
export async function deleteRecipe(ctx: IAllExecuteFunctions, id: number): Promise<IDataObject> {
  await tandoorApiRequest(ctx, {
    method: 'DELETE',
    endpoint: `/api/recipe/${id}/`,
  });
  return { success: true, id };
}

/** Reference data lookups (foods, units, keywords). */
export async function listFoods(
  ctx: IAllExecuteFunctions,
  query: string | undefined,
  returnAll: boolean,
  limit: number,
): Promise<IDataObject[]> {
  const qs: IDataObject = {};
  if (query) qs.query = query;
  return tandoorApiRequestAllItems(ctx, '/api/food/', qs, returnAll ? 0 : limit);
}

export async function listUnits(
  ctx: IAllExecuteFunctions,
  query: string | undefined,
  returnAll: boolean,
  limit: number,
): Promise<IDataObject[]> {
  const qs: IDataObject = {};
  if (query) qs.query = query;
  return tandoorApiRequestAllItems(ctx, '/api/unit/', qs, returnAll ? 0 : limit);
}

export async function listKeywords(
  ctx: IAllExecuteFunctions,
  query: string | undefined,
  returnAll: boolean,
  limit: number,
): Promise<IDataObject[]> {
  const qs: IDataObject = {};
  if (query) qs.query = query;
  return tandoorApiRequestAllItems(ctx, '/api/keyword/', qs, returnAll ? 0 : limit);
}

export type { FoundRef };
