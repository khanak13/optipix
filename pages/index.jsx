import { SparklesCore } from "@/components/ui/sparkles";

export default function Home() {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center text-center overflow-hidden bg-black">
      
      {/* Sparkles Background */}
      <SparklesCore
        className="absolute inset-0 z-0"
        background="#000000"
        minSize={0.4}
        maxSize={1.2}
        particleDensity={60}
        particleColor="#4cc9f0"
        speed={0.9}
      />

      {/* Content */}
      <div className="relative z-10 max-w-2xl mx-auto px-6">
        <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
          Image Resizer & Optimizer
        </h1>

        <p className="text-gray-300 text-lg mb-8">
          Compress. Resize. Shine.  
          Fast, clean, and smooth image optimization right in your browser.
        </p>

        <a
          href="/resizer"
          className="inline-block bg-blue-600 hover:bg-blue-700 text-white text-lg px-6 py-3 rounded-lg shadow-lg transition"
        >
          Get Started
        </a>
      </div>

      {/* Footer */}
      <footer className="absolute bottom-6 text-gray-500 text-xs">
        Built by khanak jain.
      </footer>
    </div>
  );
}
