export const surpriseStyles = {
  tree: 'The Wishing Tree',
  parcels: 'Ribbon Parcels',
  evening: 'A Candlelit Celebration',
  film: 'A Note in Motion',
  folded: 'The Folded Letter',
};
export type SurpriseStyle = keyof typeof surpriseStyles;
export function isSurpriseStyle(value:string|null):value is SurpriseStyle {
  return value !== null && Object.hasOwn(surpriseStyles,value);
}
