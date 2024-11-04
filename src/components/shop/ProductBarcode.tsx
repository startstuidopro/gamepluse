import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

interface ProductBarcodeProps {
  barcode: string;
  size?: { width: number; height: number };
}

export default function ProductBarcode({ barcode, size = { width: 2, height: 100 } }: ProductBarcodeProps) {
  const barcodeRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (barcodeRef.current) {
      JsBarcode(barcodeRef.current, barcode, {
        width: size.width,
        height: size.height,
        displayValue: true,
        fontSize: 12,
        margin: 10,
      });
    }
  }, [barcode, size]);

  return <svg ref={barcodeRef} className="w-full"></svg>;
}