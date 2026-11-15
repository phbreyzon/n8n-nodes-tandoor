/**
 * Shared types mirroring the relevant parts of the Tandoor REST API.
 * See the OpenAPI specification shipped with Tandoor (`/api/docs`).
 *
 * These are declared as `type` aliases (not `interface`s) on purpose: object
 * type aliases get an implicit index signature and are therefore assignable to
 * n8n's `IDataObject`, which interfaces are not.
 */

export type TandoorCredentials = {
  baseUrl: string;
  apiToken: string;
};

/** Standard Django REST Framework pagination envelope. */
export type Paginated<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export type Food = {
  id?: number;
  name: string;
  plural_name?: string | null;
  description?: string;
};

export type Unit = {
  id?: number;
  name: string;
  plural_name?: string | null;
  description?: string;
};

export type Keyword = {
  id?: number;
  name: string;
  label?: string;
};

export type PropertyType = {
  id: number;
  name: string;
  unit?: string | null;
  open_data_slug?: string | null;
};

export type Property = {
  id?: number;
  property_amount: number | null;
  property_type: PropertyType;
};

export type NutritionInformation = {
  id?: number;
  calories?: number;
  carbohydrates?: number;
  fats?: number;
  proteins?: number;
  source?: string | null;
};

export type Ingredient = {
  id?: number;
  food: Food;
  unit: Unit | null;
  amount: number;
  note?: string;
  order?: number;
  is_header?: boolean;
  no_amount?: boolean;
};

export type Step = {
  id?: number;
  name?: string;
  instruction: string;
  ingredients: Ingredient[];
  time?: number;
  order?: number;
  show_as_header?: boolean;
};

export type Recipe = {
  id?: number;
  name: string;
  description?: string;
  keywords?: Keyword[];
  steps: Step[];
  working_time?: number;
  waiting_time?: number;
  source_url?: string;
  internal?: boolean;
  show_ingredient_overview?: boolean;
  nutrition?: NutritionInformation | null;
  properties?: Property[];
  servings?: number;
  servings_text?: string;
  private?: boolean;
};

export type RecipeOverview = {
  id: number;
  name: string;
  keywords?: { id: number; label?: string; name?: string }[];
  servings?: number;
  internal?: boolean;
};

/** Compact result of a find-or-create lookup. */
export type FoundRef = {
  id: number;
  name: string;
  created: boolean;
};

export type MealType = {
  id?: number;
  name: string;
  order?: number;
  time?: string | null;
  color?: string | null;
  default?: boolean;
};

export type MealPlan = {
  id?: number;
  title?: string;
  recipe?: RecipeOverview | number | null;
  servings: number;
  note?: string;
  from_date: string;
  to_date?: string;
  meal_type?: MealType | number;
  addshopping?: boolean;
  recipe_name?: string;
  meal_type_name?: string;
};

export type ShoppingListEntry = {
  id: number;
  food?: Food | null;
  amount?: number;
  unit?: Unit | null;
  checked?: boolean;
};

export type AutoMealPlan = {
  start_date: string;
  end_date: string;
  meal_type_id: number;
  keyword_ids: number[];
  servings: number;
  addshopping: boolean;
};
