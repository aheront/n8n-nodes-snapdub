import type {
	IAuthenticateGeneric,
	Icon,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class SnapDubApi implements ICredentialType {
	name = 'snapDubApi';

	displayName = 'SnapDub API';

	icon: Icon = { light: 'file:../icons/snapdub.svg', dark: 'file:../icons/snapdub.dark.svg' };

	documentationUrl = 'https://snapdub.ai/developers/api';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			placeholder: 'sd_live_...',
			description: 'Create one in SnapDub under Settings, API keys. It comes with every paid plan.',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://snapdub.ai/api/v1',
			url: '/me',
			method: 'GET',
		},
	};
}
