import type {
	Icon,
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class PahekoApiRESTApi implements ICredentialType {
	name = 'pahekoApiRESTApi';
	displayName = 'Paheko REST API';
	icon: Icon = 'file:../icons/paheko.svg';
	documentationUrl = 'https://paheko.cloud';
	properties: INodeProperties[] = [
		{
			displayName: 'Paheko Base URL',
			name: 'baseUrl',
			type: 'string',
			default: '',
			description: 'Base URL of your Paheko instance',
			placeholder: 'https://your-instance.paheko.cloud',
		},
		{
			displayName: 'API Identifier',
			name: 'apiId',
			type: 'string',
			default: '',
			description: 'API identifier (identifiant API)',
		},
		{
			displayName: 'API Password',
			name: 'apiPassword',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description: 'API password',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			auth: {
				username: '={{$credentials.apiId}}',
				password: '={{$credentials.apiPassword}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			url: '/api/sql',
			method: 'POST',
			body: {
				sql: 'SELECT 1',
			},
		},
	};
}
