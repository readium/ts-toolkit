import { parseNptTime } from "../../../util/npt.ts";
import { Timeline, PublicationLike } from "./Timeline.ts";

export function buildAudioTimeline(pub: PublicationLike, opts?: { depth?: number }): Timeline {
    const t = Timeline.build(pub, opts);
    const ro = pub.readingOrder.items;
    const canLabel = ro.length <= 1 || ro.every(l => l.duration !== undefined);
    if (!canLabel) return t;

    let offset = 0;
    const offsets = new Map(ro.map(l => {
        const o = offset;
        offset += l.duration ?? 0;
        return [l.href, o];
    }));

    t.augment((_item, link) => {
        const href = link.href;
        const hashIndex = href.indexOf('#');
        const bare = hashIndex >= 0 ? href.slice(0, hashIndex) : href;
        const fragment = hashIndex >= 0 ? href.slice(hashIndex + 1) : undefined;
        const trackOffset = offsets.get(bare) ?? 0;
        const tMatch = fragment?.match(/(?:^|&)t=([^&]+)/);
        const seconds = tMatch ? parseNptTime(tMatch[1]) : undefined;
        return {
            position: trackOffset + (seconds ?? 0),
        };
    });

    return t;
}
