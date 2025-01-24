import  {  useState, useEffect } from 'react';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;  
}

export default function BarcodeScanner({ onScan }: BarcodeScannerProps) {

  const [manualBarcode, setManualBarcode] = useState('');
  
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (manualBarcode.trim()) {
        onScan(manualBarcode.trim());
        setManualBarcode('');
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [manualBarcode, onScan]);

  return (
        <div className="mt-4">
            <input
              type="text"
              value={manualBarcode}
              onChange={(e) => setManualBarcode(e.target.value)}
              className="w-full bg-slate-700 px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Enter barcode..."
            />
        </div>
  );
}