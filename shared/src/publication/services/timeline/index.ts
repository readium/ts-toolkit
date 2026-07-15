import { Profile } from "../../Profiles.ts";
import { PublicationLike, Timeline } from "./Timeline.ts";
import { buildAudioTimeline } from "./audio.ts";
import { buildHtmlTimeline } from "./html.ts";

export * from './Timeline.ts';
export * from './TimelineItem.ts';
export { buildHtmlTimeline } from './html.ts';
export { buildAudioTimeline } from './audio.ts';

export function buildTimeline(pub: PublicationLike, options?: { depth?: number }): Timeline {
    const isAudio = pub.metadata?.conformsTo?.includes(Profile.AUDIOBOOK) ?? false;
    return isAudio ? buildAudioTimeline(pub, options) : buildHtmlTimeline(pub, options);
}
