/** localStorage key and `<html data-intro>` value that remember a collapsed intro across visits. */
export const INTRO_STORAGE_KEY = "intro";
export const INTRO_COLLAPSED = "collapsed";

/**
 * Sets `<html data-intro="collapsed">` before first paint when the visitor collapsed the intro
 * last time, so the intro never flashes open. Inlined into `<head>` by the root layout.
 */
export const RESTORE_INTRO_SCRIPT = `try{if(localStorage.getItem(${JSON.stringify(INTRO_STORAGE_KEY)})===${JSON.stringify(INTRO_COLLAPSED)})document.documentElement.dataset.intro=${JSON.stringify(INTRO_COLLAPSED)}}catch(e){}`;
