import { Timeline, PublicationLike } from "./Timeline.ts";

export function buildHtmlTimeline(pub: PublicationLike, opts?: { depth?: number }): Timeline {
    return Timeline.build(pub, opts);
}
