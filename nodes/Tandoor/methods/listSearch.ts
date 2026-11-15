import { ILoadOptionsFunctions, INodeListSearchResult } from 'n8n-workflow';

import { Paginated, RecipeOverview } from '../interfaces/types';
import { tandoorApiRequest } from '../helpers/client';

/**
 * Server-side recipe search used by the "Recipe" resource locator fields.
 * Tandoor's `query` parameter does a fuzzy match against the recipe name.
 */
export async function searchRecipes(this: ILoadOptionsFunctions, filter?: string): Promise<INodeListSearchResult> {
  const response = await tandoorApiRequest<Paginated<RecipeOverview>>(this, {
    endpoint: '/api/recipe/',
    qs: {
      query: filter ?? '',
      page_size: 50,
    },
  });

  const results = (response?.results ?? []).map((recipe) => ({
    name: recipe.name,
    value: recipe.id,
  }));

  return { results };
}
