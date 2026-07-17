// Local persistence: autosave slot + model library, both in IndexedDB.

import { createStore, del, get, keys, set } from "idb-keyval";
import type { ModelJSON } from "../core/voxels";

const store = createStore("blocksmith", "models");

const AUTOSAVE_KEY = "autosave";
const LIB_PREFIX = "lib:";

export interface LibraryEntry {
  id: string;
  name: string;
  updatedAt: number;
  model: ModelJSON;
  thumb: string; // data URL
}

export function saveAutosave(model: ModelJSON): Promise<void> {
  return set(AUTOSAVE_KEY, model, store);
}

export function loadAutosave(): Promise<ModelJSON | undefined> {
  return get<ModelJSON>(AUTOSAVE_KEY, store);
}

export function saveEntry(entry: LibraryEntry): Promise<void> {
  return set(LIB_PREFIX + entry.id, entry, store);
}

export function deleteEntry(id: string): Promise<void> {
  return del(LIB_PREFIX + id, store);
}

export async function listLibrary(): Promise<LibraryEntry[]> {
  const ks = await keys(store);
  const libKeys = ks.filter((k) => typeof k === "string" && k.startsWith(LIB_PREFIX));
  const entries = await Promise.all(libKeys.map((k) => get<LibraryEntry>(k, store)));
  return entries
    .filter((e): e is LibraryEntry => !!e)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export function newId(): string {
  return typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
