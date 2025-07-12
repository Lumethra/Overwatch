import CpuCard from "@/components/CpuCard";
import GpuCard from "@/components/GpuCard";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">OVERWATCH</h1>
          <p className="text-gray-600 dark:text-gray-400">Real-time system monitoring</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          <CpuCard />
          <GpuCard />
        </div>
      </div>
    </div>
  );
}
