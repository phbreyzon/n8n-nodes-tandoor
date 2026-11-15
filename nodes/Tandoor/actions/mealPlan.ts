import { IAllExecuteFunctions, IDataObject } from 'n8n-workflow';

import { tandoorApiRequest, tandoorApiRequestAllItems } from '../helpers/client';
import { filterMealPlansByDateWindow } from '../helpers/mealplan';

export interface ListMealPlansParams {
  returnAll: boolean;
  limit?: number;
  fromDate?: string;
  toDate?: string;
  mealTypeIds?: number[];
}

export interface CreateMealPlanParams {
  fromDate: string;
  mealTypeId: number;
  servings: number;
  recipeId?: number;
  title?: string;
  toDate?: string;
  note?: string;
  addShopping?: boolean;
}

export interface UpdateMealPlanParams {
  id: number;
  recipeId?: number;
  title?: string;
  servings?: number;
  fromDate?: string;
  toDate?: string;
  mealTypeId?: number;
  note?: string;
}

export interface AutoMealPlanParams {
  startDate: string;
  endDate: string;
  mealTypeId: number;
  keywordIds: number[];
  servings: number;
  addShopping: boolean;
}

/**
 * List meal plans, auto-paginating. With a date window, only entries starting
 * inside the window are returned (overlapping entries are filtered out).
 */
export async function listMealPlans(ctx: IAllExecuteFunctions, params: ListMealPlansParams): Promise<IDataObject[]> {
  const qs: IDataObject = {};
  if (params.fromDate) qs.from_date = params.fromDate;
  if (params.toDate) qs.to_date = params.toDate;
  if (params.mealTypeIds && params.mealTypeIds.length > 0) {
    qs.meal_type = params.mealTypeIds;
  }

  const limit = params.returnAll ? 0 : (params.limit ?? 50);
  const entries = await tandoorApiRequestAllItems(ctx, '/api/meal-plan/', qs, limit);

  return filterMealPlansByDateWindow(
    entries as { from_date?: string }[],
    params.fromDate,
    params.toDate,
  ) as IDataObject[];
}

/** Fetch a single meal plan. */
export async function getMealPlan(ctx: IAllExecuteFunctions, id: number): Promise<IDataObject> {
  return tandoorApiRequest(ctx, { endpoint: `/api/meal-plan/${id}/` });
}

/** Create a meal plan entry. */
export async function createMealPlan(ctx: IAllExecuteFunctions, params: CreateMealPlanParams): Promise<IDataObject> {
  if (!params.servings || typeof params.servings !== 'number' || params.servings <= 0) {
    throw new Error('Servings must be a positive number');
  }
  if (!params.fromDate || typeof params.fromDate !== 'string') {
    throw new Error('From Date is required and must be a date (YYYY-MM-DD)');
  }
  if (!params.mealTypeId || typeof params.mealTypeId !== 'number') {
    throw new Error('Meal Type is required');
  }
  if (!params.recipeId && !params.title) {
    throw new Error('Either a Recipe or a Title must be provided');
  }

  const body: IDataObject = {
    servings: params.servings,
    from_date: params.fromDate,
    meal_type: params.mealTypeId,
  };

  if (params.recipeId) body.recipe = params.recipeId;
  if (params.title) body.title = params.title;
  if (params.toDate) body.to_date = params.toDate;
  if (params.note) body.note = params.note;
  if (params.addShopping !== undefined) body.addshopping = params.addShopping;

  return tandoorApiRequest(ctx, {
    method: 'POST',
    endpoint: '/api/meal-plan/',
    body,
  });
}

/** Update a meal plan entry. */
export async function updateMealPlan(ctx: IAllExecuteFunctions, params: UpdateMealPlanParams): Promise<IDataObject> {
  if (!params.id || typeof params.id !== 'number') {
    throw new Error('Meal Plan ID is required');
  }
  if (params.servings !== undefined && (typeof params.servings !== 'number' || params.servings <= 0)) {
    throw new Error('Servings must be a positive number');
  }

  const updates: IDataObject = {};
  if (params.recipeId !== undefined) updates.recipe = params.recipeId;
  if (params.title !== undefined) updates.title = params.title;
  if (params.servings !== undefined) updates.servings = params.servings;
  if (params.fromDate !== undefined) updates.from_date = params.fromDate;
  if (params.toDate !== undefined) updates.to_date = params.toDate;
  if (params.mealTypeId !== undefined) updates.meal_type = params.mealTypeId;
  if (params.note !== undefined) updates.note = params.note;

  if (Object.keys(updates).length === 0) {
    throw new Error('At least one field must be provided to update');
  }

  return tandoorApiRequest(ctx, {
    method: 'PATCH',
    endpoint: `/api/meal-plan/${params.id}/`,
    body: updates,
  });
}

/** Delete a meal plan entry. */
export async function deleteMealPlan(ctx: IAllExecuteFunctions, id: number): Promise<IDataObject> {
  await tandoorApiRequest(ctx, {
    method: 'DELETE',
    endpoint: `/api/meal-plan/${id}/`,
  });
  return { success: true, id };
}

/** Auto-generate meal plans for a date range based on keywords. */
export async function autoMealPlan(ctx: IAllExecuteFunctions, params: AutoMealPlanParams): Promise<IDataObject> {
  if (!params.startDate) throw new Error('Start Date is required (YYYY-MM-DD)');
  if (!params.endDate) throw new Error('End Date is required (YYYY-MM-DD)');
  if (!params.mealTypeId) throw new Error('Meal Type is required');
  if (!params.keywordIds || params.keywordIds.length === 0) {
    throw new Error('At least one keyword is required');
  }
  if (!params.servings || params.servings <= 0) {
    throw new Error('Servings must be a positive number');
  }
  if (new Date(params.startDate) > new Date(params.endDate)) {
    throw new Error('Start Date must be before or equal to End Date');
  }

  return tandoorApiRequest(ctx, {
    method: 'POST',
    endpoint: '/api/auto-plan/',
    body: {
      start_date: params.startDate,
      end_date: params.endDate,
      meal_type_id: params.mealTypeId,
      keyword_ids: params.keywordIds,
      servings: params.servings,
      addshopping: params.addShopping ?? false,
    },
  });
}

/** List available meal types (breakfast, lunch, dinner, ...). */
export async function listMealTypes(ctx: IAllExecuteFunctions): Promise<IDataObject[]> {
  return tandoorApiRequestAllItems(ctx, '/api/meal-type/');
}

/** List the current shopping list entries. */
export async function getShoppingList(ctx: IAllExecuteFunctions): Promise<IDataObject[]> {
  return tandoorApiRequestAllItems(ctx, '/api/shopping-list-entry/');
}
