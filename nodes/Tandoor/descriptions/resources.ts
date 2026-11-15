import { INodeProperties } from 'n8n-workflow';

export const resources: INodeProperties[] = [
  {
    displayName: 'Resource',
    name: 'resource',
    type: 'options',
    noDataExpression: true,
    options: [
      {
        name: 'Food',
        value: 'food',
        description: 'Look up foods used as ingredients',
      },
      {
        name: 'Keyword',
        value: 'keyword',
        description: 'Look up keywords used to tag recipes',
      },
      {
        name: 'Meal Plan',
        value: 'mealPlan',
        description: 'Manage scheduled meals',
      },
      {
        name: 'Meal Type',
        value: 'mealType',
        description: 'Look up meal types such as breakfast, lunch and dinner',
      },
      {
        name: 'Recipe',
        value: 'recipe',
        description: 'Manage recipes',
      },
      {
        name: 'Shopping List',
        value: 'shoppingList',
        description: 'Read the current shopping list',
      },
      {
        name: 'Unit',
        value: 'unit',
        description: 'Look up units used for ingredient amounts',
      },
    ],
    default: 'recipe',
  },
];
