import { BaseItem } from "../base-item";
import { createGarden } from "../garden";

export const graphFrom = (content: { [key: string]: string }) =>
  createGarden({ content, type: "inmemory" }).graph;
