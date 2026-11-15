import { INodeProperties } from 'n8n-workflow';

export const recipeOperations: INodeProperties[] = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: {
      show: {
        resource: ['recipe'],
      },
    },
    options: [
      {
        name: 'Create',
        value: 'create',
        description: 'Create a new recipe',
        action: 'Create a recipe',
      },
      {
        name: 'Delete',
        value: 'delete',
        description: 'Permanently delete a recipe',
        action: 'Delete a recipe',
      },
      {
        name: 'Get',
        value: 'get',
        description: 'Get a single recipe by ID',
        action: 'Get a recipe',
      },
      {
        name: 'Get Many',
        value: 'getAll',
        description: 'List recipes with optional filters',
        action: 'Get many recipes',
      },
      {
        name: 'Update',
        value: 'update',
        description: 'Update an existing recipe',
        action: 'Update a recipe',
      },
    ],
    default: 'getAll',
  },
];

/** Build the `steps` field (with nested ingredients) for create/update. */
function stepsField(operations: string[]): INodeProperties {
  return {
    displayName: 'Steps',
    name: 'steps',
    type: 'fixedCollection',
    typeOptions: {
      multipleValues: true,
    },
    default: {},
    required: operations.includes('create'),
    displayOptions: {
      show: {
        resource: ['recipe'],
        operation: operations,
      },
    },
    description: 'Recipe steps. For updates this REPLACES the entire steps array, so include every step.',
    options: [
      {
        displayName: 'Step',
        name: 'step',
        values: [
          {
            displayName: 'Name',
            name: 'name',
            type: 'string',
            default: '',
            description: 'Optional step name',
          },
          {
            displayName: 'Instruction',
            name: 'instruction',
            type: 'string',
            typeOptions: {
              rows: 3,
            },
            default: '',
            description: 'What to do in this step',
          },
          {
            displayName: 'Time',
            name: 'time',
            type: 'number',
            default: 0,
            description: 'Time in minutes for this step',
          },
          {
            displayName: 'Ingredients',
            name: 'ingredients',
            type: 'fixedCollection',
            typeOptions: {
              multipleValues: true,
            },
            default: {},
            description:
              'Foods used in this step. Foods and units are matched to existing records when possible and created otherwise.',
            options: [
              {
                displayName: 'Ingredient',
                name: 'ingredient',
                values: [
                  {
                    displayName: 'Food',
                    name: 'food',
                    type: 'string',
                    default: '',
                    required: true,
                    description: 'Food name — matched to an existing food when possible',
                  },
                  {
                    displayName: 'Amount',
                    name: 'amount',
                    type: 'number',
                    default: 0,
                    description: 'Amount of the food',
                  },
                  {
                    displayName: 'Unit',
                    name: 'unit',
                    type: 'string',
                    default: '',
                    description: 'Unit name — matched to an existing unit when possible',
                  },
                  {
                    displayName: 'Note',
                    name: 'note',
                    type: 'string',
                    default: '',
                    description: 'Additional note, e.g. "finely chopped"',
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  };
}

const recipeReference: INodeProperties = {
  displayName: 'Recipe',
  name: 'recipeId',
  type: 'resourceLocator',
  default: { mode: 'list', value: '' },
  required: true,
  displayOptions: {
    show: {
      resource: ['recipe'],
      operation: ['get', 'update', 'delete'],
    },
  },
  description: 'The recipe to operate on',
  modes: [
    {
      displayName: 'From List',
      name: 'list',
      type: 'list',
      placeholder: 'Select a recipe...',
      typeOptions: {
        searchListMethod: 'searchRecipes',
        searchable: true,
      },
    },
    {
      displayName: 'By ID',
      name: 'id',
      type: 'string',
      placeholder: 'e.g. 42',
      validation: [
        {
          type: 'regex',
          properties: {
            regex: '^[0-9]+$',
            errorMessage: 'Recipe ID must be a number',
          },
        },
      ],
    },
  ],
};

const sortOrderOptions = [
  { name: 'Name (A-Z)', value: 'name' },
  { name: 'Name (Z-A)', value: '-name' },
  { name: 'Rating (Low to High)', value: 'rating' },
  { name: 'Rating (High to Low)', value: '-rating' },
  { name: 'Last Cooked (Oldest First)', value: 'lastcooked' },
  { name: 'Last Cooked (Newest First)', value: '-lastcooked' },
  { name: 'Times Cooked (Fewest First)', value: 'times_cooked' },
  { name: 'Times Cooked (Most First)', value: '-times_cooked' },
  { name: 'Created (Oldest First)', value: 'created_at' },
  { name: 'Created (Newest First)', value: '-created_at' },
];

export const recipeFields: INodeProperties[] = [
  recipeReference,
  // ----- Get Many -----
  {
    displayName: 'Return All',
    name: 'returnAll',
    type: 'boolean',
    default: false,
    displayOptions: {
      show: {
        resource: ['recipe'],
        operation: ['getAll'],
      },
    },
    description: 'Whether to return all results or only up to a given limit',
  },
  {
    displayName: 'Limit',
    name: 'limit',
    type: 'number',
    default: 50,
    typeOptions: {
      minValue: 1,
    },
    displayOptions: {
      show: {
        resource: ['recipe'],
        operation: ['getAll'],
        returnAll: [false],
      },
    },
    description: 'Max number of results to return',
  },
  {
    displayName: 'Filters',
    name: 'filters',
    type: 'collection',
    placeholder: 'Add Filter',
    default: {},
    displayOptions: {
      show: {
        resource: ['recipe'],
        operation: ['getAll'],
      },
    },
    options: [
      {
        displayName: 'Keywords',
        name: 'keywords',
        type: 'multiOptions',
        typeOptions: {
          loadOptionsMethod: 'getKeywords',
        },
        default: [],
        description: 'Only return recipes tagged with any of these keywords',
      },
      {
        displayName: 'Query',
        name: 'query',
        type: 'string',
        default: '',
        description: 'Fuzzy text search against the recipe name',
      },
      {
        displayName: 'Rating (At Least)',
        name: 'ratingGte',
        type: 'number',
        default: 0,
        description: 'Only return recipes rated at least this value',
      },
      {
        displayName: 'Sort Order',
        name: 'sortOrder',
        type: 'options',
        options: sortOrderOptions,
        default: 'name',
        description: 'Order in which to return the recipes',
      },
    ],
  },
  // ----- Create -----
  {
    displayName: 'Name',
    name: 'name',
    type: 'string',
    default: '',
    required: true,
    displayOptions: {
      show: {
        resource: ['recipe'],
        operation: ['create'],
      },
    },
    description: 'Name of the recipe',
  },
  {
    displayName: 'Additional Fields',
    name: 'additionalFields',
    type: 'collection',
    placeholder: 'Add Field',
    default: {},
    displayOptions: {
      show: {
        resource: ['recipe'],
        operation: ['create'],
      },
    },
    options: [
      {
        displayName: 'Description',
        name: 'description',
        type: 'string',
        typeOptions: {
          rows: 3,
        },
        default: '',
      },
      {
        displayName: 'Internal',
        name: 'internal',
        type: 'boolean',
        default: false,
        description: 'Whether to hide the recipe from the default recipe list in Tandoor',
      },
      {
        displayName: 'Keywords',
        name: 'keywords',
        type: 'multiOptions',
        typeOptions: {
          loadOptionsMethod: 'getKeywords',
        },
        default: [],
        description: 'Existing keywords to tag the recipe with',
      },
      {
        displayName: 'New Keywords',
        name: 'newKeywords',
        type: 'string',
        typeOptions: {
          multipleValues: true,
        },
        default: '',
        placeholder: 'Add keyword',
        description: 'Keyword names to find or create and add to the recipe',
      },
      {
        displayName: 'Private',
        name: 'private',
        type: 'boolean',
        default: false,
      },
      {
        displayName: 'Servings',
        name: 'servings',
        type: 'number',
        default: 1,
      },
      {
        displayName: 'Servings Text',
        name: 'servingsText',
        type: 'string',
        default: '',
        description: 'Text description of the servings, e.g. "1 loaf"',
      },
      {
        displayName: 'Show Ingredient Overview',
        name: 'showIngredientOverview',
        type: 'boolean',
        default: true,
      },
      {
        displayName: 'Source URL',
        name: 'sourceUrl',
        type: 'string',
        default: '',
        description: 'URL the recipe was taken from',
      },
      {
        displayName: 'Waiting Time (Minutes)',
        name: 'waitingTime',
        type: 'number',
        default: 0,
        description: 'Passive waiting time in minutes',
      },
      {
        displayName: 'Working Time (Minutes)',
        name: 'workingTime',
        type: 'number',
        default: 0,
        description: 'Active working time in minutes',
      },
    ],
  },
  stepsField(['create']),
  // ----- Update -----
  {
    displayName: 'Update Fields',
    name: 'updateFields',
    type: 'collection',
    placeholder: 'Add Field',
    default: {},
    displayOptions: {
      show: {
        resource: ['recipe'],
        operation: ['update'],
      },
    },
    options: [
      {
        displayName: 'Description',
        name: 'description',
        type: 'string',
        typeOptions: {
          rows: 3,
        },
        default: '',
      },
      {
        displayName: 'Internal',
        name: 'internal',
        type: 'boolean',
        default: false,
      },
      {
        displayName: 'Keywords',
        name: 'keywords',
        type: 'multiOptions',
        typeOptions: {
          loadOptionsMethod: 'getKeywords',
        },
        default: [],
        description: 'Existing keywords to tag the recipe with (replaces the current keywords)',
      },
      {
        displayName: 'New Keywords',
        name: 'newKeywords',
        type: 'string',
        typeOptions: {
          multipleValues: true,
        },
        default: '',
        placeholder: 'Add keyword',
        description: 'Keyword names to find or create and add to the recipe',
      },
      {
        displayName: 'Name',
        name: 'name',
        type: 'string',
        default: '',
      },
      {
        displayName: 'Private',
        name: 'private',
        type: 'boolean',
        default: false,
      },
      {
        displayName: 'Servings',
        name: 'servings',
        type: 'number',
        default: 0,
      },
      {
        displayName: 'Servings Text',
        name: 'servingsText',
        type: 'string',
        default: '',
      },
      {
        displayName: 'Show Ingredient Overview',
        name: 'showIngredientOverview',
        type: 'boolean',
        default: true,
      },
      {
        displayName: 'Source URL',
        name: 'sourceUrl',
        type: 'string',
        default: '',
      },
      {
        displayName: 'Waiting Time (Minutes)',
        name: 'waitingTime',
        type: 'number',
        default: 0,
      },
      {
        displayName: 'Working Time (Minutes)',
        name: 'workingTime',
        type: 'number',
        default: 0,
      },
    ],
  },
  {
    displayName: 'Nutrition',
    name: 'nutrition',
    type: 'collection',
    placeholder: 'Add Nutrition',
    default: {},
    displayOptions: {
      show: {
        resource: ['recipe'],
        operation: ['update'],
      },
    },
    description:
      'Nutrition information per serving. Values are written to both the nutrition field and the recipe properties shown in the Tandoor UI. Only the values you provide are changed.',
    options: [
      {
        displayName: 'Calories',
        name: 'calories',
        type: 'number',
        default: 0,
        description: 'Calories per serving (kcal)',
      },
      {
        displayName: 'Carbohydrates',
        name: 'carbohydrates',
        type: 'number',
        default: 0,
        description: 'Carbohydrates per serving (g)',
      },
      {
        displayName: 'Fats',
        name: 'fats',
        type: 'number',
        default: 0,
        description: 'Fats per serving (g)',
      },
      {
        displayName: 'Proteins',
        name: 'proteins',
        type: 'number',
        default: 0,
        description: 'Proteins per serving (g)',
      },
      {
        displayName: 'Source',
        name: 'source',
        type: 'string',
        default: '',
        description: 'Source of the nutrition data',
      },
    ],
  },
  {
    displayName: 'Clear Nutrition',
    name: 'clearNutrition',
    type: 'boolean',
    default: false,
    displayOptions: {
      show: {
        resource: ['recipe'],
        operation: ['update'],
      },
    },
    description: 'Whether to remove all nutrition information from the recipe',
  },
  stepsField(['update']),
];
