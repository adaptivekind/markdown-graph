import { createGarden } from "../garden";

export const graphFrom = async (content: { [key: string]: string }) =>
  (await createGarden({ content, type: "inmemory" })).graph;
