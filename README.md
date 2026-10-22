# n8n-nodes-snapdub

[SnapDub](https://snapdub.ai) nodes for [n8n](https://n8n.io). Turn a long video (stream, podcast, interview) into vertical clips with captions, then schedule and post them to TikTok, YouTube and Instagram, all from a workflow.

## Installation

In n8n, open **Settings → Community nodes → Install** and enter `n8n-nodes-snapdub`. See the [n8n community nodes guide](https://docs.n8n.io/integrations/community-nodes/installation/).

## Credentials

You need a SnapDub API key. The API comes with every paid plan.

1. In SnapDub, open **Settings → API keys** and create a key.
2. In n8n, add a **SnapDub API** credential and paste the key (`sd_live_...`).

## Nodes

### SnapDub

| Resource | Operations |
|---|---|
| Video | Create Clips, Estimate Cost, Get, Get Clips, Get Many, Get Transcript |
| Clip | Get, Update (title, description, hashtags, re-cut), Get Stats, Get Transcript |
| Post | Schedule, Get Many, Reschedule, Retry, Delete |
| Campaign | Get Many, Get, Track Submission, Get Earnings |
| Account | Get (credits and plan), Get Templates, Get Social Accounts, Get Post Stats |

The node can also be used as a tool by n8n AI agents.

### SnapDub Trigger

Starts a workflow when a video finishes and its clips are ready (optionally also when a video fails). It checks your recent videos on the polling interval you choose.

## Example: clip every new video and post the best clip

1. **SnapDub → Video: Create Clips** with your video link.
2. **SnapDub Trigger → Clips Ready** in a second workflow.
3. **SnapDub → Video: Get Clips** with `{{ $json.video_id }}`. Clips come best first, one item each.
4. **SnapDub → Post: Schedule** with the first clip's `clip_id` and your platforms.

## Notes

- Making clips takes a few minutes to tens of minutes, depending on the video's length, and spends credits from your SnapDub account.
- Download links in clip results are valid for an hour.
- Errors come back in plain words, for example `Not enough credits: this video needs 412 and the account has 120.`

## Resources

- [SnapDub API reference](https://snapdub.ai/developers/api)
- [OpenAPI document](https://snapdub.ai/api/v1/openapi.json)
- Support: hello@snapdub.ai

## License

[MIT](LICENSE.md)
