export function calcLineAmounts(
  qty: number,
  up: number,
  taxId: string,
  taxRto = 13
): { amtn_net: number; tax: number; gross: number } {
  const q = Number(qty) || 0;
  const p = Number(up) || 0;
  const gross = Math.round(q * p * 100) / 100;
  const rto = Number(taxRto) || 0;
  let amtn_net = gross;
  let tax = 0;
  if (taxId === '2') {
    tax = Math.round(((gross * rto) / (100 + rto)) * 100) / 100;
    amtn_net = Math.round((gross - tax) * 100) / 100;
  } else if (taxId === '3') {
    amtn_net = gross;
    tax = Math.round(((amtn_net * rto) / 100) * 100) / 100;
  }
  return { amtn_net, tax, gross: amtn_net + tax };
}

export function sumLines(
  lines: { amtn_net?: number; tax?: number }[]
): { amtn_net: number; tax: number; total: number } {
  let amtn_net = 0;
  let tax = 0;
  for (const ln of lines) {
    amtn_net += Number(ln.amtn_net) || 0;
    tax += Number(ln.tax) || 0;
  }
  return {
    amtn_net: Math.round(amtn_net * 100) / 100,
    tax: Math.round(tax * 100) / 100,
    total: Math.round((amtn_net + tax) * 100) / 100,
  };
}
