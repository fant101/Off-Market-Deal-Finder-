"use client";

interface BadgeProps {
  variant?: "high" | "medium" | "low" | "default" | "gold";
  children: React.ReactNode;
  className?: string;
}

export default function Badge({ variant = "default", children, className = "" }: BadgeProps) {
  const variants = {
    high: "bg-red-100 text-red-700 border-red-200",
    medium: "bg-amber-100 text-amber-700 border-amber-200",
    low: "bg-green-100 text-green-700 border-green-200",
    default: "bg-gray-100 text-gray-700 border-gray-200",
    gold: "bg-resolute-gold/10 text-resolute-gold border-resolute-gold/30",
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
