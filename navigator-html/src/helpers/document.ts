
export function isRTL(wnd: Window): boolean {
    return wnd.document.body.dir.toLowerCase() === "rtl";
}

export function getColumnCountPerScreen(wnd: Window) {
    return parseInt(
        wnd.getComputedStyle(
            wnd.document.documentElement
        ).getPropertyValue("column-count")
    );
}