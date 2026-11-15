import { ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';

import { MealType } from '../interfaces/types';
import { tandoorApiRequestAllItems } from '../helpers/client';

/** Meal types are a small, fixed list — load them all. */
export async function getMealTypes(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
  const mealTypes = await tandoorApiRequestAllItems<MealType>(this, '/api/meal-type/');

  return mealTypes.map((mealType) => ({
    name: mealType.name,
    value: mealType.id as number,
  }));
}

/** Keywords used for filtering recipes and auto-generating meal plans. */
export async function getKeywords(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
  const keywords = await tandoorApiRequestAllItems<{ id: number; name: string }>(this, '/api/keyword/');

  return keywords.map((keyword) => ({
    name: keyword.name,
    value: keyword.id,
  }));
}
