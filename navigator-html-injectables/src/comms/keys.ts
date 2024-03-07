

export type CommsEventKey =
    "_pong" |
    "_unhandled" |
    "_ack" |
    "log" |
    "error" |
    "click" |
    "tap" |
    "tap_more" |
    "no_more" |
    "no_less" |
    "swipe" |
    "progress" |
    "first_visible_locator";
;

export type CommsCommandKey =
    "_ping" |
    "go_prev" |
    "go_next" |
    "go_id" |
    "go_text" |
    "go_end" |
    "go_start" |
    "go_progression" |
    "set_property" |
    "remove_property" |
    // "exact_progress" |
    "first_visible_locator" |
    "decorate" |
    "protect" |
    "unprotect" |
    "unfocus" |
    "focus" |
    "activate" |
    "shake";
;