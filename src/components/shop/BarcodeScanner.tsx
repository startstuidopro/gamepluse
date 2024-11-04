import React, { useRef, useState } from 'react';
import Webcam from 'react-webcam';
import { Camera, X } from 'lucide-react';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const webcamRef = useRef<Webcam>(null);
  const [isScanning, setIsScanning] = useState(false);

  // Simulated barcode detection
  const captureFrame = () => {
    if (!isScanning) {
      setIsScanning(true);
      const imageSrc = webcamRef.current?.getScreenshot();
      if (imageSrc) {
        // In a real app, you'd use a barcode detection library here
        // For demo, we'll simulate finding a barcode after 1 second
        setTimeout(() => {
          // Generate a random barcode from our product list for demo
          const demoBarcode = Math.random() > 0.5 ? 'PS-DRINK-001' : 'PS-SNACK-001';
          onScan(demoBarcode);
          setIsScanning(false);
        }, 1000);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-xl p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-white">Scan Barcode</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="relative">
          <Webcam
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            className="rounded-lg w-full"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="border-2 border-purple-500 w-64 h-32 rounded-lg"></div>
          </div>
        </div>

        <button
          onClick={captureFrame}
          disabled={isScanning}
          className={`w-full mt-4 flex items-center justify-center gap-2 py-2 px-4 rounded-lg transition ${
            isScanning
              ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
              : 'bg-purple-600 hover:bg-purple-700 text-white'
          }`}
        >
          <Camera className="h-5 w-5" />
          {isScanning ? 'Scanning...' : 'Scan Barcode'}
        </button>
      </div>
    </div>
  );
}