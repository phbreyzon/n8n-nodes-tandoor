import { IAuthenticateGeneric, ICredentialTestRequest, ICredentialType, INodeProperties } from 'n8n-workflow';

export class TandoorApi implements ICredentialType {
  name = 'tandoorApi';

  displayName = 'Tandoor API';

  documentationUrl = 'https://github.com/TandoorRecipes/recipes';

  properties: INodeProperties[] = [
    {
      displayName: 'Base URL',
      name: 'baseUrl',
      type: 'string',
      default: 'https://tandoor.example.com',
      placeholder: 'https://tandoor.example.com',
      required: true,
      description:
        'URL of your Tandoor instance, without a trailing slash. The URL of your instance is the address you use to open Tandoor in a browser.',
    },
    {
      displayName: 'API Token',
      name: 'apiToken',
      type: 'string',
      typeOptions: {
        password: true,
      },
      default: '',
      required: true,
      description: 'API token for your Tandoor user. Create one in Tandoor under Settings > API Tokens.',
    },
  ];

  authenticate: IAuthenticateGeneric = {
    type: 'generic',
    properties: {
      headers: {
        Authorization: '=Bearer {{$credentials.apiToken}}',
      },
    },
  };

  test: ICredentialTestRequest = {
    request: {
      baseURL: '={{$credentials.baseUrl}}',
      url: '/api/meal-type/',
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    },
  };
}
