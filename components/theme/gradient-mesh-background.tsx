"use client";

import { cn } from "@/lib/utils";

interface GradientMeshBackgroundProps {
  className?: string;
  children?: React.ReactNode;
}

export function GradientMeshBackground({ 
  className,
  children 
}: GradientMeshBackgroundProps) {
  return (
    <div 
      className={cn(
        "fixed inset-0 -z-10 mesh-bg mesh-grid",
        className
      )}
      aria-hidden="true"
    >
      {children}
    </div>
  );
}

// Alternative version with animated blobs (more performant on some browsers)
export function GradientMeshBackgroundAnimated({ 
  className 
}: GradientMeshBackgroundProps) {
  return (
    <div 
      className={cn(
        "fixed inset-0 -z-10 overflow-hidden pointer-events-none",
        className
      )}
      aria-hidden="true"
    >
      {/* Dark theme blobs */}
      <div className="mesh-blobs-dark absolute inset-0">
        <div className="absolute top-[10%] left-[20%] w-[600px] h-[600px] rounded-full opacity-20 blur-[120px] animate-blob bg-purple-600" />
        <div className="absolute top-[5%] right-[15%] w-[500px] h-[500px] rounded-full opacity-15 blur-[100px] animate-blob animation-delay-2000 bg-pink-600" />
        <div className="absolute bottom-[5%] left-[50%] w-[700px] h-[500px] rounded-full opacity-15 blur-[140px] animate-blob animation-delay-4000 bg-cyan-500" />
        <div className="absolute bottom-[10%] left-[5%] w-[500px] h-[400px] rounded-full opacity-12 blur-[100px] animate-blob animation-delay-6000 bg-blue-600" />
        <div className="absolute top-[60%] right-[5%] w-[400px] h-[400px] rounded-full opacity-10 blur-[100px] animate-blob animation-delay-8000 bg-emerald-500" />
      </div>

      {/* Light theme blobs */}
      <div className="mesh-blobs-light absolute inset-0">
        <div className="absolute top-[10%] left-[20%] w-[600px] h-[600px] rounded-full opacity-50 blur-[150px] animate-blob bg-violet-300" />
        <div className="absolute top-[5%] right-[15%] w-[500px] h-[500px] rounded-full opacity-40 blur-[130px] animate-blob animation-delay-2000 bg-pink-300" />
        <div className="absolute bottom-[5%] left-[50%] w-[700px] h-[500px] rounded-full opacity-40 blur-[160px] animate-blob animation-delay-4000 bg-sky-300" />
        <div className="absolute bottom-[10%] left-[5%] w-[500px] h-[400px] rounded-full opacity-35 blur-[130px] animate-blob animation-delay-6000 bg-indigo-300" />
        <div className="absolute top-[60%] right-[5%] w-[400px] h-[400px] rounded-full opacity-30 blur-[130px] animate-blob animation-delay-8000 bg-teal-300" />
      </div>
    </div>
  );
}
