import type {
	Icon,
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class PahekoApi implements ICredentialType {
	name = 'pahekoApi';

	displayName = 'Paheko API';
	documentationUrl = 'https://paheko.cloud';

	icon: Icon = 'file:../icons/paheko.svg';

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
			displayName: 'Email',
			name: 'email',
			type: 'string',
			default: '',
			placeholder: 'contact@example.com',
			description: 'Paheko account email',
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description: 'Paheko account password',
		},
	];

	// Authenticate is empty — we handle cookies manually via Cookie header.
	// This is required so httpRequestWithAuthentication doesn't throw.
	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {},
	};

	test: ICredentialTestRequest = {
		request: {
			url: '={{$credentials.baseUrl}}/admin/login.php',
			method: 'GET',
		},
	};
}
