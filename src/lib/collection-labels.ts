import labels from './collection-labels.json';

/** CMS navigation metadata shared by the local and hosted collection browsers. */
export const collectionLabels: Record<string, { label: string; hidden?: boolean }> = labels;

export default collectionLabels;
