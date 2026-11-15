import { INodeProperties } from 'n8n-workflow';

export const mealPlanOperations: INodeProperties[] = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: {
      show: {
        resource: ['mealPlan'],
      },
    },
    options: [
      {
        name: 'Auto Generate',
        value: 'autoGenerate',
        description: 'Automatically generate meal plans from keywords',
        action: 'Auto generate meal plans',
      },
      {
        name: 'Create',
        value: 'create',
        description: 'Schedule a meal',
        action: 'Create a meal plan',
      },
      {
        name: 'Delete',
        value: 'delete',
        description: 'Delete a meal plan',
        action: 'Delete a meal plan',
      },
      {
        name: 'Get',
        value: 'get',
        description: 'Get a single meal plan by ID',
        action: 'Get a meal plan',
      },
      {
        name: 'Get Many',
        value: 'getAll',
        description: 'List meal plans with optional date filters',
        action: 'Get many meal plans',
      },
      {
        name: 'Update',
        value: 'update',
        description: 'Update an existing meal plan',
        action: 'Update a meal plan',
      },
    ],
    default: 'getAll',
  },
];

export const mealPlanFields: INodeProperties[] = [
  // ----- Get Many -----
  {
    displayName: 'Return All',
    name: 'returnAll',
    type: 'boolean',
    default: false,
    displayOptions: {
      show: {
        resource: ['mealPlan'],
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
        resource: ['mealPlan'],
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
        resource: ['mealPlan'],
        operation: ['getAll'],
      },
    },
    options: [
      {
        displayName: 'From Date',
        name: 'fromDate',
        type: 'dateTime',
        default: '',
        description: 'Only return entries starting on or after this date',
      },
      {
        displayName: 'Meal Types',
        name: 'mealTypeIds',
        type: 'multiOptions',
        typeOptions: {
          loadOptionsMethod: 'getMealTypes',
        },
        default: [],
        description: 'Only return entries of these meal types',
      },
      {
        displayName: 'To Date',
        name: 'toDate',
        type: 'dateTime',
        default: '',
        description: 'Only return entries starting on or before this date',
      },
    ],
  },
  // ----- Meal Plan ID -----
  {
    displayName: 'Meal Plan ID',
    name: 'mealPlanId',
    type: 'number',
    default: 0,
    required: true,
    displayOptions: {
      show: {
        resource: ['mealPlan'],
        operation: ['get', 'update', 'delete'],
      },
    },
    description: 'ID of the meal plan entry',
  },
  // ----- Create -----
  {
    displayName: 'From Date',
    name: 'fromDate',
    type: 'dateTime',
    default: '={{ $now.toISODate() }}',
    required: true,
    displayOptions: {
      show: {
        resource: ['mealPlan'],
        operation: ['create'],
      },
    },
    description: 'Date the meal is planned for',
  },
  {
    displayName: 'Meal Type',
    name: 'mealTypeId',
    type: 'options',
    typeOptions: {
      loadOptionsMethod: 'getMealTypes',
    },
    default: '',
    required: true,
    displayOptions: {
      show: {
        resource: ['mealPlan'],
        operation: ['create', 'autoGenerate'],
      },
    },
    description: 'Meal type, e.g. breakfast, lunch or dinner',
  },
  {
    displayName: 'Servings',
    name: 'servings',
    type: 'number',
    default: 1,
    typeOptions: {
      minValue: 1,
    },
    required: true,
    displayOptions: {
      show: {
        resource: ['mealPlan'],
        operation: ['create', 'autoGenerate'],
      },
    },
    description: 'Number of servings to plan',
  },
  {
    displayName: 'Additional Fields',
    name: 'additionalFields',
    type: 'collection',
    placeholder: 'Add Field',
    default: {},
    displayOptions: {
      show: {
        resource: ['mealPlan'],
        operation: ['create'],
      },
    },
    options: [
      {
        displayName: 'Add to Shopping List',
        name: 'addShopping',
        type: 'boolean',
        default: false,
        description: 'Whether to add the recipe ingredients to the shopping list',
      },
      {
        displayName: 'Note',
        name: 'note',
        type: 'string',
        typeOptions: {
          rows: 2,
        },
        default: '',
      },
      {
        displayName: 'Recipe',
        name: 'recipeId',
        type: 'resourceLocator',
        default: { mode: 'list', value: '' },
        description: 'Recipe to schedule. Provide this or a Title.',
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
      },
      {
        displayName: 'Title',
        name: 'title',
        type: 'string',
        default: '',
        description: 'Free-text meal title, used when no recipe is selected',
      },
      {
        displayName: 'To Date',
        name: 'toDate',
        type: 'dateTime',
        default: '',
        description: 'End date for multi-day entries (defaults to the from date)',
      },
    ],
  },
  // ----- Update -----
  {
    displayName: 'Update Fields',
    name: 'updateFields',
    type: 'collection',
    placeholder: 'Add Field',
    default: {},
    displayOptions: {
      show: {
        resource: ['mealPlan'],
        operation: ['update'],
      },
    },
    options: [
      {
        displayName: 'From Date',
        name: 'fromDate',
        type: 'dateTime',
        default: '',
      },
      {
        displayName: 'Meal Type',
        name: 'mealTypeId',
        type: 'options',
        typeOptions: {
          loadOptionsMethod: 'getMealTypes',
        },
        default: '',
      },
      {
        displayName: 'Note',
        name: 'note',
        type: 'string',
        typeOptions: {
          rows: 2,
        },
        default: '',
      },
      {
        displayName: 'Recipe',
        name: 'recipeId',
        type: 'resourceLocator',
        default: { mode: 'list', value: '' },
        description: 'Recipe to schedule',
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
      },
      {
        displayName: 'Servings',
        name: 'servings',
        type: 'number',
        default: 0,
      },
      {
        displayName: 'Title',
        name: 'title',
        type: 'string',
        default: '',
      },
      {
        displayName: 'To Date',
        name: 'toDate',
        type: 'dateTime',
        default: '',
      },
    ],
  },
  // ----- Auto Generate -----
  {
    displayName: 'Start Date',
    name: 'startDate',
    type: 'dateTime',
    default: '={{ $now.toISODate() }}',
    required: true,
    displayOptions: {
      show: {
        resource: ['mealPlan'],
        operation: ['autoGenerate'],
      },
    },
    description: 'First date to generate meals for',
  },
  {
    displayName: 'End Date',
    name: 'endDate',
    type: 'dateTime',
    default: '={{ $now.plus({ days: 7 }).toISODate() }}',
    required: true,
    displayOptions: {
      show: {
        resource: ['mealPlan'],
        operation: ['autoGenerate'],
      },
    },
    description: 'Last date to generate meals for',
  },
  {
    displayName: 'Keywords',
    name: 'keywordIds',
    type: 'multiOptions',
    typeOptions: {
      loadOptionsMethod: 'getKeywords',
    },
    default: [],
    required: true,
    displayOptions: {
      show: {
        resource: ['mealPlan'],
        operation: ['autoGenerate'],
      },
    },
    description: 'Only recipes with any of these keywords are considered',
  },
  {
    displayName: 'Add to Shopping List',
    name: 'addShopping',
    type: 'boolean',
    default: false,
    displayOptions: {
      show: {
        resource: ['mealPlan'],
        operation: ['autoGenerate'],
      },
    },
    description: 'Whether to add the ingredients of the generated meals to the shopping list',
  },
];
