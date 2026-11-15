import {
  IDataObject,
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  NodeOperationError,
} from 'n8n-workflow';

import * as mealPlanActions from './actions/mealPlan';
import * as recipeActions from './actions/recipe';
import {
  foodFields,
  foodOperations,
  keywordFields,
  keywordOperations,
  mealPlanFields,
  mealPlanOperations,
  mealTypeFields,
  mealTypeOperations,
  recipeFields,
  recipeOperations,
  resources,
  shoppingListFields,
  shoppingListOperations,
  unitFields,
  unitOperations,
} from './descriptions';
import { toDateOnly } from './helpers/mealplan';
import { StepInput } from './helpers/recipe';
import { getKeywords, getMealTypes } from './methods/loadOptions';
import { searchRecipes } from './methods/listSearch';

/** Read the numeric ID out of a resource locator value (or a plain value). */
function extractResourceId(value: unknown): number | undefined {
  let raw: unknown = value;

  if (value !== null && typeof value === 'object' && 'value' in (value as Record<string, unknown>)) {
    raw = (value as Record<string, unknown>).value;
  }

  if (raw === undefined || raw === null || raw === '') {
    return undefined;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/** Read a required numeric ID, throwing a helpful node error when missing. */
function requireResourceId(ctx: IExecuteFunctions, value: unknown, label: string, i: number): number {
  const id = extractResourceId(value);
  if (id === undefined) {
    throw new NodeOperationError(ctx.getNode(), `${label} is required`, { itemIndex: i });
  }
  return id;
}

/** Normalise a string / multi-value string field into a clean array. */
function toStringArray(value: unknown): string[] | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  const values = (Array.isArray(value) ? value : [value])
    .map((entry) => String(entry).trim())
    .filter((entry) => entry !== '');

  return values;
}

/** Convert a multiOptions value into an array of numeric IDs. */
function toNumberArray(value: unknown): number[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  return value.map((entry) => Number(entry)).filter((entry) => Number.isFinite(entry));
}

/**
 * Convert the fixedCollection value produced by the `steps` field into the
 * shape the actions expect.
 */
function normalizeSteps(parameter: IDataObject | undefined): StepInput[] {
  const stepEntries = (parameter?.step as IDataObject[] | undefined) ?? [];

  return stepEntries.map((step) => {
    const ingredientEntries =
      ((step.ingredients as IDataObject | undefined)?.ingredient as IDataObject[] | undefined) ?? [];

    return {
      name: (step.name as string) || undefined,
      instruction: (step.instruction as string) || undefined,
      time: step.time === undefined ? undefined : Number(step.time),
      ingredients: ingredientEntries.map((ingredient) => ({
        food: ingredient.food as string,
        amount: ingredient.amount === undefined ? 0 : Number(ingredient.amount),
        unit: (ingredient.unit as string) || undefined,
        note: (ingredient.note as string) || undefined,
      })),
    };
  });
}

async function handleRecipe(
  ctx: IExecuteFunctions,
  operation: string,
  i: number,
): Promise<IDataObject | IDataObject[]> {
  if (operation === 'getAll') {
    const returnAll = ctx.getNodeParameter('returnAll', i, false) as boolean;
    const filters = ctx.getNodeParameter('filters', i, {}) as IDataObject;

    return recipeActions.listRecipes(ctx, {
      returnAll,
      limit: returnAll ? 0 : (ctx.getNodeParameter('limit', i, 50) as number),
      query: (filters.query as string) || undefined,
      keywords: toNumberArray(filters.keywords),
      ratingGte: filters.ratingGte as number | undefined,
      sortOrder: (filters.sortOrder as string) || undefined,
    });
  }

  if (operation === 'get') {
    return recipeActions.getRecipeById(ctx, requireResourceId(ctx, ctx.getNodeParameter('recipeId', i), 'Recipe', i));
  }

  if (operation === 'create') {
    const additionalFields = ctx.getNodeParameter('additionalFields', i, {}) as IDataObject;
    const steps = normalizeSteps(ctx.getNodeParameter('steps', i, {}) as IDataObject);

    return recipeActions.createRecipe(ctx, {
      name: ctx.getNodeParameter('name', i) as string,
      description: (additionalFields.description as string) || undefined,
      servings: additionalFields.servings as number | undefined,
      servingsText: (additionalFields.servingsText as string) || undefined,
      workingTime: additionalFields.workingTime as number | undefined,
      waitingTime: additionalFields.waitingTime as number | undefined,
      sourceUrl: (additionalFields.sourceUrl as string) || undefined,
      keywords: toNumberArray(additionalFields.keywords),
      newKeywords: toStringArray(additionalFields.newKeywords),
      internal: additionalFields.internal as boolean | undefined,
      private: additionalFields.private as boolean | undefined,
      showIngredientOverview: additionalFields.showIngredientOverview as boolean | undefined,
      steps,
    });
  }

  if (operation === 'update') {
    const id = requireResourceId(ctx, ctx.getNodeParameter('recipeId', i), 'Recipe', i);
    const updateFields = ctx.getNodeParameter('updateFields', i, {}) as IDataObject;
    const nutrition = ctx.getNodeParameter('nutrition', i, {}) as IDataObject;
    const clearNutrition = ctx.getNodeParameter('clearNutrition', i, false) as boolean;
    const steps = normalizeSteps(ctx.getNodeParameter('steps', i, {}) as IDataObject);

    const params: recipeActions.UpdateRecipeParams = { id };

    if ('name' in updateFields) params.name = updateFields.name as string;
    if ('description' in updateFields) params.description = updateFields.description as string;
    if ('servings' in updateFields) params.servings = updateFields.servings as number;
    if ('servingsText' in updateFields) params.servingsText = updateFields.servingsText as string;
    if ('workingTime' in updateFields) params.workingTime = updateFields.workingTime as number;
    if ('waitingTime' in updateFields) params.waitingTime = updateFields.waitingTime as number;
    if ('sourceUrl' in updateFields) params.sourceUrl = updateFields.sourceUrl as string;
    if ('internal' in updateFields) params.internal = updateFields.internal as boolean;
    if ('private' in updateFields) params.private = updateFields.private as boolean;
    if ('showIngredientOverview' in updateFields) {
      params.showIngredientOverview = updateFields.showIngredientOverview as boolean;
    }
    if ('keywords' in updateFields) params.keywords = toNumberArray(updateFields.keywords) ?? [];
    if ('newKeywords' in updateFields) params.newKeywords = toStringArray(updateFields.newKeywords);

    if (steps.length > 0) {
      params.steps = steps;
    }

    if (clearNutrition) {
      params.nutrition = null;
    } else if (Object.keys(nutrition).length > 0) {
      params.nutrition = nutrition as recipeActions.NutritionInput;
    }

    return recipeActions.updateRecipe(ctx, params);
  }

  if (operation === 'delete') {
    return recipeActions.deleteRecipe(ctx, requireResourceId(ctx, ctx.getNodeParameter('recipeId', i), 'Recipe', i));
  }

  throw new NodeOperationError(ctx.getNode(), `Unsupported recipe operation "${operation}"`, {
    itemIndex: i,
  });
}

async function handleMealPlan(
  ctx: IExecuteFunctions,
  operation: string,
  i: number,
): Promise<IDataObject | IDataObject[]> {
  if (operation === 'getAll') {
    const returnAll = ctx.getNodeParameter('returnAll', i, false) as boolean;
    const filters = ctx.getNodeParameter('filters', i, {}) as IDataObject;

    return mealPlanActions.listMealPlans(ctx, {
      returnAll,
      limit: returnAll ? 0 : (ctx.getNodeParameter('limit', i, 50) as number),
      fromDate: toDateOnly(filters.fromDate) || undefined,
      toDate: toDateOnly(filters.toDate) || undefined,
      mealTypeIds: toNumberArray(filters.mealTypeIds),
    });
  }

  if (operation === 'get') {
    return mealPlanActions.getMealPlan(
      ctx,
      requireResourceId(ctx, ctx.getNodeParameter('mealPlanId', i), 'Meal Plan ID', i),
    );
  }

  if (operation === 'create') {
    const additionalFields = ctx.getNodeParameter('additionalFields', i, {}) as IDataObject;

    return mealPlanActions.createMealPlan(ctx, {
      fromDate: toDateOnly(ctx.getNodeParameter('fromDate', i)),
      mealTypeId: ctx.getNodeParameter('mealTypeId', i) as number,
      servings: ctx.getNodeParameter('servings', i) as number,
      recipeId: extractResourceId(additionalFields.recipeId),
      title: (additionalFields.title as string) || undefined,
      toDate: toDateOnly(additionalFields.toDate) || undefined,
      note: (additionalFields.note as string) || undefined,
      addShopping: additionalFields.addShopping as boolean | undefined,
    });
  }

  if (operation === 'update') {
    const id = requireResourceId(ctx, ctx.getNodeParameter('mealPlanId', i), 'Meal Plan ID', i);
    const updateFields = ctx.getNodeParameter('updateFields', i, {}) as IDataObject;

    const params: mealPlanActions.UpdateMealPlanParams = { id };

    if ('recipeId' in updateFields) params.recipeId = extractResourceId(updateFields.recipeId);
    if ('title' in updateFields) params.title = updateFields.title as string;
    if ('servings' in updateFields) params.servings = updateFields.servings as number;
    if ('fromDate' in updateFields) params.fromDate = toDateOnly(updateFields.fromDate);
    if ('toDate' in updateFields) params.toDate = toDateOnly(updateFields.toDate);
    if ('mealTypeId' in updateFields) params.mealTypeId = updateFields.mealTypeId as number;
    if ('note' in updateFields) params.note = updateFields.note as string;

    return mealPlanActions.updateMealPlan(ctx, params);
  }

  if (operation === 'delete') {
    return mealPlanActions.deleteMealPlan(
      ctx,
      requireResourceId(ctx, ctx.getNodeParameter('mealPlanId', i), 'Meal Plan ID', i),
    );
  }

  if (operation === 'autoGenerate') {
    return mealPlanActions.autoMealPlan(ctx, {
      startDate: toDateOnly(ctx.getNodeParameter('startDate', i)),
      endDate: toDateOnly(ctx.getNodeParameter('endDate', i)),
      mealTypeId: ctx.getNodeParameter('mealTypeId', i) as number,
      keywordIds: toNumberArray(ctx.getNodeParameter('keywordIds', i, [])) ?? [],
      servings: ctx.getNodeParameter('servings', i) as number,
      addShopping: ctx.getNodeParameter('addShopping', i, false) as boolean,
    });
  }

  throw new NodeOperationError(ctx.getNode(), `Unsupported meal plan operation "${operation}"`, {
    itemIndex: i,
  });
}

async function handleLookup(
  ctx: IExecuteFunctions,
  resource: 'food' | 'unit' | 'keyword',
  i: number,
): Promise<IDataObject[]> {
  const returnAll = ctx.getNodeParameter('returnAll', i, false) as boolean;
  const query = (ctx.getNodeParameter('query', i, '') as string) || undefined;
  const limit = returnAll ? 0 : (ctx.getNodeParameter('limit', i, 50) as number);

  if (resource === 'food') {
    return recipeActions.listFoods(ctx, query, returnAll, limit);
  }
  if (resource === 'unit') {
    return recipeActions.listUnits(ctx, query, returnAll, limit);
  }
  return recipeActions.listKeywords(ctx, query, returnAll, limit);
}

export class Tandoor implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Tandoor',
    name: 'tandoor',
    icon: 'file:tandoor.svg',
    group: ['transform'],
    version: 1,
    subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
    description: 'Manage recipes, meal plans, foods, units, keywords and the shopping list in Tandoor Recipes',
    defaults: {
      name: 'Tandoor',
    },
    inputs: ['main'],
    outputs: ['main'],
    usableAsTool: true,
    credentials: [
      {
        name: 'tandoorApi',
        required: true,
      },
    ],
    codex: {
      categories: ['Productivity'],
    },
    properties: [
      resources[0],

      recipeOperations[0],
      mealPlanOperations[0],
      foodOperations[0],
      unitOperations[0],
      keywordOperations[0],
      mealTypeOperations[0],
      shoppingListOperations[0],

      ...recipeFields,
      ...mealPlanFields,
      ...foodFields,
      ...unitFields,
      ...keywordFields,
      ...mealTypeFields,
      ...shoppingListFields,
    ],
  };

  methods = {
    loadOptions: {
      getMealTypes,
      getKeywords,
    },
    listSearch: {
      searchRecipes,
    },
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];
    const resource = this.getNodeParameter('resource', 0) as string;
    const operation = this.getNodeParameter('operation', 0) as string;

    for (let i = 0; i < items.length; i++) {
      try {
        let result: IDataObject | IDataObject[];

        if (resource === 'recipe') {
          result = await handleRecipe(this, operation, i);
        } else if (resource === 'mealPlan') {
          result = await handleMealPlan(this, operation, i);
        } else if (resource === 'food' || resource === 'unit' || resource === 'keyword') {
          result = await handleLookup(this, resource, i);
        } else if (resource === 'mealType') {
          result = await mealPlanActions.listMealTypes(this);
        } else if (resource === 'shoppingList') {
          result = await mealPlanActions.getShoppingList(this);
        } else {
          throw new NodeOperationError(this.getNode(), `Unsupported resource "${resource}"`, {
            itemIndex: i,
          });
        }

        if (Array.isArray(result)) {
          for (const entry of result) {
            returnData.push({ json: entry, pairedItem: { item: i } });
          }
        } else {
          returnData.push({ json: result, pairedItem: { item: i } });
        }
      } catch (error) {
        if (this.continueOnFail()) {
          returnData.push({ json: { error: error.message }, pairedItem: { item: i } });
          continue;
        }
        throw error;
      }
    }

    return [returnData];
  }
}
