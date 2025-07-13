import { GardenConfig, GardenOptions } from "./types";

const defaultConfig: GardenConfig = {
  type: "file",
  content: {},
};

export const toConfig = (options: GardenOptions): GardenConfig => {
  return {
    ...defaultConfig,
    ...options,
  };
};
