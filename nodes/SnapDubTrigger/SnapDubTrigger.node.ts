import {
	NodeConnectionTypes,
	type IDataObject,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
	type IPollFunctions,
} from 'n8n-workflow';

// Fires when a video in the SnapDub account finishes: its clips are ready ("done"), or, if asked,
// it failed. SnapDub has no webhooks yet, so this polls GET /videos (newest first) and remembers
// which finished videos it has already reported.

const SEEN_LIMIT = 200;

export class SnapDubTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'SnapDub Trigger',
		name: 'snapDubTrigger',
		icon: { light: 'file:../../icons/snapdub.svg', dark: 'file:../../icons/snapdub.dark.svg' },
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["event"]}}',
		description: 'Starts the workflow when a SnapDub video finishes and its clips are ready',
		defaults: { name: 'SnapDub Trigger' },
		polling: true,
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'snapDubApi', required: true }],
		properties: [
			{
				displayName: 'Event',
				name: 'event',
				type: 'options',
				options: [
					{
						name: 'Clips Ready',
						value: 'done',
						description: 'A video finished and its clips are ready',
					},
					{
						name: 'Clips Ready or Video Failed',
						value: 'finished',
						description: 'A video finished, whether its clips are ready or it failed',
					},
				],
				default: 'done',
			},
		],
	};

	async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
		const event = this.getNodeParameter('event') as string;
		const state = this.getWorkflowStaticData('node') as { seen?: string[] };

		const answer = (await this.helpers.httpRequestWithAuthentication.call(this, 'snapDubApi', {
			method: 'GET',
			url: 'https://snapdub.ai/api/v1/videos',
			json: true,
		})) as { videos?: IDataObject[] };

		const wanted = event === 'finished' ? ['done', 'failed'] : ['done'];
		const finished = (answer.videos ?? []).filter((video) => wanted.includes(video.status as string));

		// A manual test run shows the newest finished video so the next nodes can be mapped.
		if (this.getMode() === 'manual') {
			return finished.length ? [this.helpers.returnJsonArray([finished[0]])] : null;
		}

		// The first poll only learns what is already finished; it reports nothing from before.
		if (!state.seen) {
			state.seen = finished.map((video) => video.video_id as string);
			return null;
		}

		const seen = new Set(state.seen);
		const fresh = finished.filter((video) => !seen.has(video.video_id as string));
		if (!fresh.length) return null;

		state.seen = [...fresh.map((video) => video.video_id as string), ...state.seen].slice(0, SEEN_LIMIT);
		return [this.helpers.returnJsonArray(fresh.reverse())];
	}
}
