"use client";

interface StatsBarProps {
  total: number;
  aQualifier: number;
  enCours: number;
  acceptes: number;
  tauxConversion: number;
}

export function StatsBar({ total, aQualifier, enCours, acceptes, tauxConversion }: StatsBarProps) {
  return (
    <div className="flex items-center gap-4 px-1 py-2 text-sm flex-wrap">
      <StatItem dot="bg-gray-400" label="Total" value={total} />
      <Separator />
      <StatItem dot="bg-sky-500" label="À qualifier" value={aQualifier} />
      <Separator />
      <StatItem dot="bg-amber-500" label="En cours" value={enCours} />
      <Separator />
      <StatItem dot="bg-emerald-500" label="Acceptés" value={acceptes} />
      <Separator />
      <StatItem dot="bg-red-500" label="Taux conv." value={`${tauxConversion}%`} />
    </div>
  );
}

function StatItem({ dot, label, value }: { dot: string; label: string; value: number | string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-gray-400 whitespace-nowrap">
      <span className={`h-2 w-2 rounded-full shrink-0 ${dot}`} />
      <span className="font-semibold text-gray-200">{value}</span>
      <span className="text-xs">{label}</span>
    </span>
  );
}

function Separator() {
  return <span className="text-gray-700 select-none">·</span>;
}
