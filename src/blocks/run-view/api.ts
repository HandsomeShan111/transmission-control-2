// Run view: plays a run's trace on the board, beat by beat; follows the batch; fast-forward, skip, hidden page and the full
// alarm (VIEW-01 to VIEW-07). It plays the trace only; the board gives the stage it plays on.
export type { Playback, Point, Resume, RunCamera, Stage, View } from "./view/play";
export { play, VIEW_PARAMS } from "./view/play";
