export interface Point {
    X: number;
    Y: number;
}

export enum HorizontalThird {
    Left,
    Center,
    Right
}

export enum VerticalThird {
    Top,
    Middle,
    Bottom
}

export interface NinthPoint {
    X: HorizontalThird;
    Y: VerticalThird;
}

export interface BibiEvent {
    Target: EventTarget;
    Coord: Point;
    Ratio: Point;
    Division: NinthPoint;
}

export default class FXLCoordinator {
    HTML: HTMLElement;
    Head: HTMLHeadElement;
    Body: HTMLElement;

    constructor() {
        this.HTML  = document.documentElement;
        this.Head  = document.head;
        this.Body  = document.body;
    }

    /*
    getElementCoord(El: any) {
        var Coord = { X: El["offsetLeft"], Y: El["offsetTop"] };
        while(El.offsetParent) El = El.offsetParent, Coord.X += El["offsetLeft"], Coord.Y += El["offsetTop"];
        return Coord;
    }
    */
    
    getBibiEventCoord(Eve: any): Point {
        const Coord: Point = { X:0, Y:0 };
        if(/^touch/.test(Eve.type)) {
            Coord.X = Eve.changedTouches[0].pageX;
            Coord.Y = Eve.changedTouches[0].pageY;
        } else {
            Coord.X = Eve.pageX;
            Coord.Y = Eve.pageY;
        }
        if(((Eve.target as HTMLElement).ownerDocument?.documentElement || (Eve.target as HTMLDocument).documentElement) === this.HTML) {
            Coord.X -= (this.HTML.scrollLeft + this.Body.scrollLeft);
            Coord.Y -= (this.HTML.scrollTop + this.Body.scrollTop);
        } else {
            /*
            var Item = Eve.target.ownerDocument.documentElement.Item;
            ItemCoord = this.getElementCoord(Item);
            if(!Item.PrePaginated && !Item.Outsourcing) ItemCoord.X += settings.S["item-padding-left"], ItemCoord.Y += settings.S["item-padding-top"];
            Coord.X = (Coord.X + ItemCoord.X - R.Main.scrollLeft) * R.Main.Transformation.Scale + R.Main.Transformation.Translation.X;
            Coord.Y = (Coord.Y + ItemCoord.Y - R.Main.scrollTop ) * R.Main.Transformation.Scale + R.Main.Transformation.Translation.Y;
            */
        }
        return Coord;
    }

    getTouchDistance(Eve: TouchEvent) {
        if (Eve.touches.length !== 2) return 0;
        const x1 = Eve.touches[0].pageX;
        const y1 = Eve.touches[0].pageY;
        const x2 = Eve.touches[1].pageX;
        const y2 = Eve.touches[1].pageY;
        return Math.sqrt((Math.pow((x2 - x1), 2)) + (Math.pow((y2 - y1), 2)));
    }

    getTouchCenter(Eve: TouchEvent): Point | null {
        if (Eve.touches.length !== 2) return null;
        const x1 = Eve.touches[0].pageX;
        const y1 = Eve.touches[0].pageY;
        const x2 = Eve.touches[1].pageX;
        const y2 = Eve.touches[1].pageY;
        return { X: (x1 + x2) / 2, Y: (y1 + y2) / 2 };
    }
    
    getBibiEvent(Eve: Event): BibiEvent {
        if(!Eve) return {
            Coord: null,
            Division: null,
            Ratio: null,
            Target: null
        };
        const Coord = this.getBibiEventCoord(Eve);
        let FlipperWidth = 0.3; // TODO flipper-width
        const Ratio = {
            X: Coord.X / window.innerWidth,
            Y: Coord.Y / window.innerHeight
        };
        let BorderT, BorderB, BorderL, BorderR;
        if(FlipperWidth < 1) { // Ratio
            BorderL = BorderT =     FlipperWidth;
            BorderR = BorderB = 1 - FlipperWidth;
        } else { // Pixel to Ratio
            BorderL = FlipperWidth / window.innerWidth;
            BorderT = FlipperWidth / window.innerHeight;
            BorderR = 1 - BorderL;
            BorderB = 1 - BorderT;
        }
        const Division: NinthPoint = {
            X: null,
            Y: null
        };
        if(Ratio.X < BorderL) Division.X = HorizontalThird.Left;
        else if(BorderR < Ratio.X) Division.X = HorizontalThird.Right;
        else                       Division.X = HorizontalThird.Center;
        if(Ratio.Y < BorderT) Division.Y = VerticalThird.Top;
        else if(BorderB < Ratio.Y) Division.Y = VerticalThird.Bottom;
        else                       Division.Y = VerticalThird.Middle;
        return {
            Target: Eve.target,
            Coord: Coord,
            Ratio: Ratio,
            Division: Division
        };
    }
}