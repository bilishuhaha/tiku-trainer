import type { EventDef, EventKey, ItemDef } from "./types";

export const ITEMS: Record<string, ItemDef> = {
  sprint100: { key: "sprint100", label: "100米", unit: "秒", dir: "down", group: "sprint", event: "sprint", note: "主项（手计时请注明）" },
  sprint60: { key: "sprint60", label: "60米", unit: "秒", dir: "down", group: "sprint", event: "sprint" },
  sprint30: { key: "sprint30", label: "30米（站立式）", unit: "秒", dir: "down", group: "sprint", event: "sprint" },
  sprint150: { key: "sprint150", label: "150米", unit: "秒", dir: "down", group: "sprint", event: "sprint" },
  tripleJump: { key: "tripleJump", label: "立定三级跳远", unit: "米", dir: "up", group: "jump", event: "tripleJump", note: "完整动作" },
  standingLongJump: { key: "standingLongJump", label: "立定跳远", unit: "米", dir: "up", group: "jump", event: "tripleJump" },
  shotPut: { key: "shotPut", label: "原地推铅球", unit: "米", dir: "up", group: "throw", event: "shotPut", note: "男5kg/女4kg，按本省标准" },
  medBallBack: { key: "medBallBack", label: "后抛实心球(2kg)", unit: "米", dir: "up", group: "throw", event: "shotPut" },
  squat: { key: "squat", label: "深蹲（杠铃）", unit: "kg", dir: "up", group: "strength", event: "shotPut" },
  bench: { key: "bench", label: "卧推", unit: "kg", dir: "up", group: "strength", event: "shotPut" },
};

export const EVENT_ORDER: EventKey[] = ["sprint", "tripleJump", "shotPut"];

export const EVENTS: Record<EventKey, EventDef> = {
  sprint: {
    key: "sprint",
    label: "短跑（100米）",
    shortLabel: "100米",
    primaryItem: "sprint100",
    items: ["sprint100", "sprint60", "sprint30", "sprint150"],
    testTip: "建议同一天测 30m + 60m + 100m，便于拆分起跑加速与后程能力",
  },
  tripleJump: {
    key: "tripleJump",
    label: "立定三级跳远",
    shortLabel: "三级跳",
    primaryItem: "tripleJump",
    items: ["tripleJump", "standingLongJump"],
    testTip: "可加测立定跳远作为爆发力参考；条件允许时记录三跳分解距离",
  },
  shotPut: {
    key: "shotPut",
    label: "原地推铅球",
    shortLabel: "铅球",
    primaryItem: "shotPut",
    items: ["shotPut", "medBallBack", "squat", "bench"],
    testTip: "可结合后抛实心球、深蹲/卧推评估全身与上肢力量基础",
  },
};

export function itemLabel(key: string): string {
  return ITEMS[key]?.label ?? key;
}
export function itemUnit(key: string): string {
  return ITEMS[key]?.unit ?? "";
}
export function isLowerBetter(key: string): boolean {
  return ITEMS[key]?.dir === "down";
}
export function eventOfItem(key: string): EventKey | undefined {
  return ITEMS[key]?.event;
}
export function eventPrimaryItem(ev: EventKey): string {
  return EVENTS[ev].primaryItem;
}
