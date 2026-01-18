import ScanStatus from "@/components/ScanStatus";

export default function ScanPage({ params }: { params: { scanId: string } }) {
  return (
    <main className="section max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-display">GMC Scan Results</h1>
        <p className="text-sm text-slate-600">Scan ID: {params.scanId}</p>
      </div>
      <ScanStatus scanId={params.scanId} />
    </main>
  );
}
