import {
	NodeConnectionTypes,
	type INodeProperties,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';

// One operation per SnapDub REST endpoint (https://snapdub.ai/api/v1/openapi.json). Declarative:
// every request is described here and n8n sends it, so the package has no runtime code of its own.

const show = (resource: string, operation: string[]) => ({ show: { resource: [resource], operation } });

// Splits a list answer ({ videos: [...] }) into one n8n item per entry.
const splitInto = (property: string) => ({
	output: { postReceive: [{ type: 'rootProperty' as const, properties: { property } }] },
});

const idField = (
	resource: string,
	operation: string[],
	displayName: string,
	description: string,
): INodeProperties => ({
	displayName,
	name: 'id',
	type: 'string',
	required: true,
	default: '',
	description,
	displayOptions: show(resource, operation),
});

const videoSettings = (operation: string): INodeProperties[] => [
	{
		displayName: 'Video URL',
		name: 'url',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'https://www.youtube.com/watch?v=...',
		description: 'Link to the long video: YouTube, Twitch, Kick, Rumble or Zoom',
		displayOptions: show('video', [operation]),
		routing: { send: { type: 'body', property: 'url' } },
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: show('video', [operation]),
		options: [
			{
				displayName: 'Captions',
				name: 'captions',
				type: 'boolean',
				default: true,
				description: 'Whether to burn captions into the clips',
				routing: { send: { type: 'body', property: 'captions' } },
			},
			{
				displayName: 'Clip Length (Seconds)',
				name: 'clip_length_seconds',
				type: 'number',
				default: 180,
				description: 'Longest a clip may run',
				routing: { send: { type: 'body', property: 'clip_length_seconds' } },
			},
			{
				displayName: 'Number of Clips',
				name: 'clips',
				type: 'number',
				default: 6,
				description: 'How many clips to make',
				routing: { send: { type: 'body', property: 'clips' } },
			},
			{
				displayName: 'Template Name',
				name: 'template',
				type: 'string',
				default: '',
				description: 'Name of one of your SnapDub templates, to apply its style',
				routing: { send: { type: 'body', property: 'template' } },
			},
			{
				displayName: 'Translate Captions To',
				name: 'translate_to',
				type: 'string',
				default: '',
				placeholder: 'es',
				description: 'Language code to translate the captions into. Leave empty to keep the original language.',
				routing: { send: { type: 'body', property: 'translate_to' } },
			},
		],
	},
];

const transcriptOptions = (resource: string): INodeProperties => ({
	displayName: 'Options',
	name: 'transcriptOptions',
	type: 'collection',
	placeholder: 'Add Option',
	default: {},
	displayOptions: show(resource, ['getTranscript']),
	options: [
		{
			displayName: 'Format',
			name: 'format',
			type: 'options',
			options: [
				{ name: 'Plain Text', value: 'txt' },
				{ name: 'SRT Subtitles', value: 'srt' },
			],
			default: 'txt',
			routing: { send: { type: 'query', property: 'format' } },
		},
		{
			displayName: 'From (Seconds)',
			name: 'from_seconds',
			type: 'number',
			default: 0,
			routing: { send: { type: 'query', property: 'from_seconds' } },
		},
		{
			displayName: 'To (Seconds)',
			name: 'to_seconds',
			type: 'number',
			default: 0,
			routing: { send: { type: 'query', property: 'to_seconds' } },
		},
	],
});

const videoProperties: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['video'] } },
		options: [
			{
				name: 'Create Clips',
				value: 'create',
				action: 'Make clips from a video',
				description: 'Turn a long video link into vertical clips with captions. Spends credits.',
				routing: { request: { method: 'POST', url: '/videos' } },
			},
			{
				name: 'Estimate Cost',
				value: 'estimate',
				action: 'Price a video before making clips',
				description: 'How many credits a video would cost, without spending any',
				routing: { request: { method: 'POST', url: '/estimate' } },
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a video s status',
				description: 'Processing status and progress. Status "done" means the clips are ready.',
				routing: { request: { method: 'GET', url: '=/videos/{{$parameter.id}}' } },
			},
			{
				name: 'Get Clips',
				value: 'getClips',
				action: 'Get the clips of a video',
				description: 'The finished clips, best first, each with a download link valid for an hour',
				routing: { request: { method: 'GET', url: '=/videos/{{$parameter.id}}/clips' }, ...splitInto('clips') },
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get recent videos',
				description: 'Your most recent videos, newest first',
				routing: { request: { method: 'GET', url: '/videos' }, ...splitInto('videos') },
			},
			{
				name: 'Get Transcript',
				value: 'getTranscript',
				action: 'Get the transcript of a video',
				routing: { request: { method: 'GET', url: '=/videos/{{$parameter.id}}/transcript' } },
			},
		],
		default: 'create',
	},
	...videoSettings('create'),
	...videoSettings('estimate'),
	idField('video', ['get', 'getClips', 'getTranscript'], 'Video ID', 'The video_id returned when the clips were requested'),
	transcriptOptions('video'),
];

const clipProperties: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['clip'] } },
		options: [
			{
				name: 'Get',
				value: 'get',
				action: 'Get a clip',
				description: 'One clip in detail, with its download link',
				routing: { request: { method: 'GET', url: '=/clips/{{$parameter.id}}' } },
			},
			{
				name: 'Get Stats',
				value: 'getStats',
				action: 'Get how a clip is doing',
				description: 'Views and engagement of a clip posted through SnapDub',
				routing: { request: { method: 'GET', url: '=/clips/{{$parameter.id}}/stats' } },
			},
			{
				name: 'Get Transcript',
				value: 'getTranscript',
				action: 'Get the transcript of a clip',
				routing: { request: { method: 'GET', url: '=/clips/{{$parameter.id}}/transcript' } },
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Edit a clip',
				description: 'Change the title, description or hashtags, or re-cut its start and end',
				routing: { request: { method: 'PATCH', url: '=/clips/{{$parameter.id}}' } },
			},
		],
		default: 'get',
	},
	idField('clip', ['get', 'getStats', 'getTranscript', 'update'], 'Clip ID', 'A clip_id from Video: Get Clips'),
	transcriptOptions('clip'),
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: show('clip', ['update']),
		options: [
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				routing: { send: { type: 'body', property: 'description' } },
			},
			{
				displayName: 'End (Seconds)',
				name: 'end_seconds',
				type: 'number',
				default: 0,
				description: 'New end of the clip in the source video. Re-cutting spends credits.',
				routing: { send: { type: 'body', property: 'end_seconds' } },
			},
			{
				displayName: 'Hashtags',
				name: 'hashtags',
				type: 'string',
				default: '',
				placeholder: '#podcast #motivation',
				routing: { send: { type: 'body', property: 'hashtags' } },
			},
			{
				displayName: 'Start (Seconds)',
				name: 'start_seconds',
				type: 'number',
				default: 0,
				description: 'New start of the clip in the source video. Re-cutting spends credits.',
				routing: { send: { type: 'body', property: 'start_seconds' } },
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
				routing: { send: { type: 'body', property: 'title' } },
			},
		],
	},
];

const postProperties: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['post'] } },
		options: [
			{
				name: 'Delete',
				value: 'delete',
				action: 'Remove a scheduled post',
				routing: { request: { method: 'DELETE', url: '=/posts/{{$parameter.id}}' } },
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get scheduled posts',
				description: 'Upcoming posts, and the ones from the last week that failed or were skipped',
				routing: { request: { method: 'GET', url: '/posts' } },
			},
			{
				name: 'Reschedule',
				value: 'reschedule',
				action: 'Move a scheduled post',
				routing: { request: { method: 'PATCH', url: '=/posts/{{$parameter.id}}' } },
			},
			{
				name: 'Retry',
				value: 'retry',
				action: 'Retry a failed post',
				routing: { request: { method: 'POST', url: '=/posts/{{$parameter.id}}/retry' } },
			},
			{
				name: 'Schedule',
				value: 'schedule',
				action: 'Schedule a clip to social media',
				description: 'Post a finished clip to your connected TikTok, YouTube or Instagram, now or later',
				routing: { request: { method: 'POST', url: '/posts' } },
			},
		],
		default: 'schedule',
	},
	{
		displayName: 'Clip ID',
		name: 'clipId',
		type: 'string',
		required: true,
		default: '',
		description: 'A clip_id from Video: Get Clips',
		displayOptions: show('post', ['schedule']),
		routing: { send: { type: 'body', property: 'clip_id' } },
	},
	{
		displayName: 'Platforms',
		name: 'platforms',
		type: 'multiOptions',
		required: true,
		options: [
			{ name: 'Instagram', value: 'instagram' },
			{ name: 'TikTok', value: 'tiktok' },
			{ name: 'YouTube', value: 'youtube' },
		],
		default: [],
		description: 'Networks to post to. They must be connected in SnapDub.',
		displayOptions: show('post', ['schedule']),
		routing: { send: { type: 'body', property: 'platforms' } },
	},
	{
		displayName: 'Post At',
		name: 'postAt',
		type: 'dateTime',
		default: '',
		description: 'When to post. Leave empty to post now.',
		displayOptions: show('post', ['schedule']),
		routing: { send: { type: 'body', property: 'post_at', value: '={{ $value || undefined }}' } },
	},
	idField('post', ['delete', 'reschedule', 'retry'], 'Post ID', 'A post_id from Post: Schedule or Post: Get Many'),
	{
		displayName: 'Post At',
		name: 'newPostAt',
		type: 'dateTime',
		required: true,
		default: '',
		description: 'The new time to post',
		displayOptions: show('post', ['reschedule']),
		routing: { send: { type: 'body', property: 'post_at' } },
	},
];

const campaignProperties: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['campaign'] } },
		options: [
			{
				name: 'Get',
				value: 'get',
				action: 'Get a clipping campaign',
				routing: { request: { method: 'GET', url: '=/campaigns/{{$parameter.id}}' } },
			},
			{
				name: 'Get Earnings',
				value: 'getEarnings',
				action: 'Get campaign earnings',
				description: 'Views and earnings of the clips you submitted to campaigns',
				routing: { request: { method: 'GET', url: '/earnings' } },
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get live clipping campaigns',
				routing: { request: { method: 'GET', url: '/campaigns' }, ...splitInto('campaigns') },
			},
			{
				name: 'Track Submission',
				value: 'submit',
				action: 'Track a clip in a campaign',
				description: 'Record that a clip was submitted to a campaign, to follow its views and earnings',
				routing: { request: { method: 'POST', url: '=/campaigns/{{$parameter.id}}/submissions' } },
			},
		],
		default: 'getAll',
	},
	idField('campaign', ['get', 'submit'], 'Campaign ID', 'A campaign_id from Campaign: Get Many'),
	{
		displayName: 'Sort By',
		name: 'sort',
		type: 'options',
		options: [
			{ name: 'Biggest Budget', value: 'budget' },
			{ name: 'Best Rate', value: 'rate' },
			{ name: 'Most Room Left', value: 'room' },
			{ name: 'Newest', value: 'new' },
		],
		default: 'budget',
		displayOptions: show('campaign', ['getAll']),
		routing: { send: { type: 'query', property: 'sort' } },
	},
	{
		displayName: 'Clip ID',
		name: 'clipId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: show('campaign', ['submit']),
		routing: { send: { type: 'body', property: 'clip_id' } },
	},
	{
		displayName: 'Post URL',
		name: 'postUrl',
		type: 'string',
		default: '',
		description: 'Link to where the clip was posted',
		displayOptions: show('campaign', ['submit']),
		routing: { send: { type: 'body', property: 'post_url', value: '={{ $value || undefined }}' } },
	},
];

const accountProperties: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['account'] } },
		options: [
			{
				name: 'Get',
				value: 'get',
				action: 'Get account and credits',
				routing: { request: { method: 'GET', url: '/me' } },
			},
			{
				name: 'Get Post Stats',
				value: 'getStats',
				action: 'Get how your posts are doing',
				routing: { request: { method: 'GET', url: '/stats' } },
			},
			{
				name: 'Get Social Accounts',
				value: 'getSocialAccounts',
				action: 'Get connected social accounts',
				routing: { request: { method: 'GET', url: '/social_accounts' } },
			},
			{
				name: 'Get Templates',
				value: 'getTemplates',
				action: 'Get templates',
				routing: { request: { method: 'GET', url: '/templates' }, ...splitInto('templates') },
			},
		],
		default: 'get',
	},
];

export class SnapDub implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'SnapDub',
		name: 'snapDub',
		icon: { light: 'file:../../icons/snapdub.svg', dark: 'file:../../icons/snapdub.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Turn long videos into vertical clips with captions and post them to social media',
		defaults: { name: 'SnapDub' },
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'snapDubApi', required: true }],
		requestDefaults: {
			baseURL: 'https://snapdub.ai/api/v1',
			headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Account', value: 'account' },
					{ name: 'Campaign', value: 'campaign' },
					{ name: 'Clip', value: 'clip' },
					{ name: 'Post', value: 'post' },
					{ name: 'Video', value: 'video' },
				],
				default: 'video',
			},
			...videoProperties,
			...clipProperties,
			...postProperties,
			...campaignProperties,
			...accountProperties,
		],
	};
}

