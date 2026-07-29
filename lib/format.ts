// All money in the app is integer pence — never a float. Convert to pounds
// only at the point of display.
export function formatPrice(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`;
}
