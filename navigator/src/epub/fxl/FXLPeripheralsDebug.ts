export default class FXLPeripheralsDebug {
    private readonly _DOM = {
        show: false,
        pinchTarget: document.createElement("div"),
        touch1: document.createElement("div"),
        touch2: document.createElement("div"),
        center: document.createElement("div"),
        stats: document.createElement("div"),
    };

    get show() {
        return this.DOM.show;
    }

    get DOM() {
        return this._DOM;
    }

    constructor() {
        this._DOM.show = true;
        this._DOM.pinchTarget.style.zIndex =this._DOM.stats.style.zIndex = this._DOM.center.style.zIndex = this._DOM.touch1.style.zIndex = this._DOM.touch2.style.zIndex = "100000";
        this._DOM.pinchTarget.style.position = this._DOM.stats.style.position = this._DOM.center.style.position = this._DOM.touch1.style.position = this._DOM.touch2.style.position = "absolute";
        this._DOM.pinchTarget.style.borderRadius = this._DOM.center.style.borderRadius = this._DOM.touch1.style.borderRadius = this._DOM.touch2.style.borderRadius = "50%";
        this._DOM.pinchTarget.style.pointerEvents = this._DOM.stats.style.pointerEvents = this._DOM.center.style.pointerEvents = this._DOM.touch1.style.pointerEvents = this._DOM.touch2.style.pointerEvents = "none";
        this._DOM.pinchTarget.style.display = this._DOM.center.style.display = this._DOM.touch1.style.display = this._DOM.touch2.style.display = "none";
        this._DOM.pinchTarget.style.paddingTop = this._DOM.center.style.paddingTop = "10px";
        this._DOM.pinchTarget.style.width = this._DOM.pinchTarget.style.height = this._DOM.center.style.width = this._DOM.center.style.height = "10px";
        this._DOM.pinchTarget.style.backgroundColor = "green";
        this._DOM.center.style.backgroundColor = "red";
        this._DOM.touch1.style.backgroundColor = this._DOM.touch2.style.backgroundColor = "blue";
        this._DOM.touch1.style.height = this._DOM.touch2.style.height = "20px";
        this._DOM.touch1.style.width = this._DOM.touch2.style.width = "20px";
        this._DOM.touch1.style.paddingTop = this._DOM.touch2.style.paddingTop = "20px";
        this._DOM.touch1.textContent = "1";
        this._DOM.touch2.textContent = "2";
        this._DOM.stats.style.padding = "20px";
        this._DOM.stats.style.backgroundColor = "rgba(0,0,0,0.5)";
        this._DOM.stats.style.color = "white";
        this._DOM.stats.textContent = "[stats]";
        document.body.appendChild(this._DOM.stats);
        document.body.appendChild(this._DOM.center);
        document.body.appendChild(this._DOM.touch1);
        document.body.appendChild(this._DOM.touch2);
        document.body.appendChild(this._DOM.pinchTarget);
    }
}