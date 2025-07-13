import type { GardenConfig, GardenRepository } from "./types";

import { BaseGardenRepository } from "./base-garden-repository";
import { FileGardenRepository } from "./file-garden-repository";

export const toRepository = (config: GardenConfig): GardenRepository => {
  if (config.type === "file") {
    if (!config.path) {
      throw new Error("File repository requires a path to be specified");
    }
    return new FileGardenRepository(config.path);
  }
  return new BaseGardenRepository(config.content);
};
