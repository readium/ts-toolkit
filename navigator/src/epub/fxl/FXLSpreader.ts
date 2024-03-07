import { Link, Links, Orientation, Page, Publication, ReadingProgression, Spread } from "@readium/shared/src/publication";

export default class FXLSpreader {
    shift = true; // TODO getter
    private spreads: Link[][] = [];
    nLandscape: number = 0; // TODO getter

    constructor(publication: Publication) {
        this.index(publication);
        this.testShift(publication);
        console.log(`Indexed ${this.spreads.length} spreads for ${publication.readingOrder.items.length} items`);
    }

    private index(publication: Publication, redo = false) {
        this.nLandscape = 0;
        publication.readingOrder.items.forEach((item, index) => {
            // item.Properties.Spread = item.Properties.Spread ? item.Properties.Spread : "landscape"; // TODO Maybe default to auto instead
            if(!redo) {
                publication.readingOrder.items[index] = item.addProperties({
                    "number": index + 1,
                    "isImage": item.type?.indexOf("image/") === 0,
                });
                // if(!orientation) item.Properties.Orientation = item.Width > item.Height ? "landscape" : "portrait";
            }
            const isLandscape = item.properties?.getOrientation() === Orientation.landscape ? true : false;
            if((!item.properties?.getPage() || redo)) item.properties = item.properties?.add({
                "page": isLandscape ? // If a landscape image
                    "center" : // Center it
                    ((((this.shift ? 0 : 1) + index - this.nLandscape) % 2) ? 
                        (publication.metadata.readingProgression === ReadingProgression.rtl ? "right" : "left") :
                        (publication.metadata.readingProgression === ReadingProgression.rtl ? "left" : "right"))
            })
            if(isLandscape || item.properties?.otherProperties["addBlank"])
                this.nLandscape++;
        });
        if(redo)
            this.spreads = [];
        this.buildSpreads(publication.readingOrder);
    }

    private testShift(publication: Publication) {
        let wasLastSingle = false;
        this.spreads.forEach((item, index) => {
            if(item.length > 1)
                return; // Only left with single-page "spreads"
            const single = item[0];
            const orientation = single.properties?.getOrientation();

            // First page is landscape/spread means no shift
            if(index === 0 && (orientation === Orientation.landscape || (orientation !== Orientation.portrait && ((single.width || 0) > (single.height || 0) || single.properties?.getSpread() === Spread.both))))
                this.shift = false;

            // If last was a true single, and this spread is a center page (that's not special), something's wrong
            if(wasLastSingle && single.properties?.getPage() === Page.center) {
                this.spreads[index - 1][0].addProperties({"addBlank": true});
                /*if(single.findFlag("final"))
                    this.nLandscape++;*/
            }

            // If this single page spread is an orphaned component of a double page spread (and it's not the first page)
            if(orientation === Orientation.portrait && single.properties?.getPage() !== "center" && single.properties?.otherProperties["number"] > 1)
                wasLastSingle = true;
            else
                wasLastSingle = false;
        });
        if(!this.shift)
            this.index(publication, true); // Re-index spreads
    }

    private buildSpreads(spine: Links) {
        let currentSet: Link[] = [];
        spine.items.forEach((item, index) => {
            if(!index && this.shift) {
                this.spreads.push([item]);
            } else if(item.properties?.getPage() === Page.center) { // If a center (single) page spread, push immediately and reset current set
                if(currentSet.length > 0) this.spreads.push(currentSet);
                this.spreads.push([item]);
                currentSet = [];
            } else if (currentSet.length >= 2) { // Spread has max 2 pages
                this.spreads.push(currentSet);
                currentSet = [item];
            } else // Add this item to current set
                currentSet.push(item);
        });
        if(currentSet.length > 0) this.spreads.push(currentSet);
    }

    currentSpread(currentSlide: number, perPage: number): Link[] {
        return this.spreads[Math.min(Math.floor(currentSlide / perPage), this.spreads.length - 1)];
    }

    findByLink(link: Link): Link[] | undefined {
        return this.spreads.find((spread) => spread.includes(link)) || undefined;
    }
}