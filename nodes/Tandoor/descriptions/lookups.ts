import { INodeProperties } from 'n8n-workflow';

/** Operation dropdown for a resource that only supports listing. */
function listOperation(resource: string): INodeProperties {
  return {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: {
      show: {
        resource: [resource],
      },
    },
    options: [
      {
        name: 'Get Many',
        value: 'getAll',
        description: 'List the available entries',
        action: 'Get many entries',
      },
    ],
    default: 'getAll',
  };
}

function returnAllField(resource: string): INodeProperties {
  return {
    displayName: 'Return All',
    name: 'returnAll',
    type: 'boolean',
    default: false,
    displayOptions: {
      show: {
        resource: [resource],
        operation: ['getAll'],
      },
    },
    description: 'Whether to return all results or only up to a given limit',
  };
}

function limitField(resource: string): INodeProperties {
  return {
    displayName: 'Limit',
    name: 'limit',
    type: 'number',
    default: 50,
    typeOptions: {
      minValue: 1,
    },
    displayOptions: {
      show: {
        resource: [resource],
        operation: ['getAll'],
        returnAll: [false],
      },
    },
    description: 'Max number of results to return',
  };
}

function queryField(resource: string): INodeProperties {
  return {
    displayName: 'Query',
    name: 'query',
    type: 'string',
    default: '',
    displayOptions: {
      show: {
        resource: [resource],
        operation: ['getAll'],
      },
    },
    description: 'Optional name filter',
  };
}

export const foodOperations = [listOperation('food')];
export const foodFields: INodeProperties[] = [returnAllField('food'), limitField('food'), queryField('food')];

export const unitOperations = [listOperation('unit')];
export const unitFields: INodeProperties[] = [returnAllField('unit'), limitField('unit'), queryField('unit')];

export const keywordOperations = [listOperation('keyword')];
export const keywordFields: INodeProperties[] = [
  returnAllField('keyword'),
  limitField('keyword'),
  queryField('keyword'),
];

export const mealTypeOperations = [listOperation('mealType')];
export const mealTypeFields: INodeProperties[] = [];

export const shoppingListOperations = [listOperation('shoppingList')];
export const shoppingListFields: INodeProperties[] = [];
