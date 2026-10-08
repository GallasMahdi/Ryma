/** Inputs must represent exact cents. No implicit rounding of issued amounts. */
export function toCents(amount: number): number {
  const cents=Math.round(amount*100);
  if (!Number.isFinite(amount) || !Number.isSafeInteger(cents) || Math.abs(amount*100-cents)>0.0000001) throw new Error('Amount must use at most two decimal places.');
  return cents;
}

export const fromCents=(cents:number):number=>cents/100;
export const sumMoney=(amounts:number[]):number=>fromCents(amounts.reduce((sum,n)=>sum+toCents(n),0));
