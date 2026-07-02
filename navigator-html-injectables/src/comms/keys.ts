

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
    "scroll" |
    "progress" |
    "first_visible_locator" |
    "text_selected" |
    "context_menu" |
    "media_play" |
    "media_pause" |
    "content_protection" |
    "keyboard_peripherals" |
    "decoration_activated";

export type CommsCommandKey =
    "_ping" |
    "go_prev" |
    "go_next" |
    "go_id" |
    "go_text" |
    "go_end" |
    "go_start" |
    "go_progression" |
    "get_properties" | 
    "update_properties" | 
    "set_property" |
    "remove_property" |
    // "exact_progress" |
    "first_visible_locator" |
    "decorate" |
    "decoration_activatable" |
    "protect" |
    "unprotect" |
    "unfocus" |
    "focus" |
    "activate" |
    "shake" |
    "force_webkit_recalc" |
    "peripherals_protection" |
    "keyboard_peripherals" |
    "scroll_protection" |
    "print_protection";
;

export type SuspiciousActivityType = 
    "developer_tools" |
    "select_all" |
    "save" |
    "suspicious_selection" |
    "bulk_copy" |
    "suspicious_scrolling" |
    "suspicious_snapping" |
    "drag_detected" |
    "drop_detected" |
    "print";