

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
    "media_play" |
    "media_pause" |
    "content_protection";
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
    "get_properties" | 
    "update_properties" | 
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
    "shake" |
    "force_webkit_recalc" |
    "peripherals_protection" |
    // "scroll_protection" |
    "print_protection";
;

export type SuspiciousActivityType = 
    | "developer_tools"
    | "select_all"
    | "suspicious_selection"
    | `custom:${string}`  // Allow custom event types with 'custom:' prefix
    | "bulk_copy"
    // | "suspicious_scrolling"
    // | "suspicious_snapping"
    | "drag_detected"
    | "drop_detected"
    | "print"
    | "context_menu"
    | "blocked_keyboard_shortcut";