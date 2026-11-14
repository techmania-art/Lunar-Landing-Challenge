import { LROC_LAYERS, type LrocLayerDefinition } from "./lroc-map-config";

export function getLrocLayerById(layerId: string): LrocLayerDefinition {
  const found = LROC_LAYERS.find((l) => l.id === layerId);
  return found || LROC_LAYERS[0];
}

export function getAllLrocLayers(): LrocLayerDefinition[] {
  return [...LROC_LAYERS];
}

