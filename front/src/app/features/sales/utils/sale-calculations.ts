export interface PreviewLine {
  price: string;
  quantity: number;
  discount: number;
  discountType?: 'PORCENTAJE' | 'IMPORTE';
}
export function previewLine(line: PreviewLine) {
  const base = Math.round(Number(line.price) * 100) * line.quantity;
  const discount =
    line.discountType === 'IMPORTE'
      ? Math.round(line.discount * 100)
      : Math.round((base * line.discount) / 100);
  return { subtotal: base, discount, total: base - discount };
}
export function previewTotals(lines: PreviewLine[]) {
  return lines.reduce(
    (sum, line) => {
      const amount = previewLine(line);
      return {
        subtotal: sum.subtotal + amount.subtotal,
        discount: sum.discount + amount.discount,
        total: sum.total + amount.total,
      };
    },
    { subtotal: 0, discount: 0, total: 0 },
  );
}
