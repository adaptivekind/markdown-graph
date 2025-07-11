import { BaseItem } from "../base-item";
import { createRepository } from "../repository";

export const graphFrom = async (content: { [key: string]: string }) =>
  createRepository({ content, type: "inmemory" }).graph;
