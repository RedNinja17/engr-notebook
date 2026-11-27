export default function calculatePrintCost(vol: number, density: number, infill: number, waste: number, pricePerGram: number): number {
  const shellRatio = 0.30;
  const effectiveVolume = vol * (shellRatio + (1 - shellRatio) * (infill / 100));
  const massGrams = effectiveVolume * density;
  const finalCost = massGrams * pricePerGram * waste;
  return finalCost;
}