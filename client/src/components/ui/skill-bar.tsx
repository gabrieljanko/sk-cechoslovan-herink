interface SkillBarProps {
  label: string;
  value: number;
}

export function SkillBar({ label, value }: SkillBarProps) {
  // Calculate width percentage (1-10 range)
  const widthPercentage = `${value * 10}%`;
  
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-xs font-medium text-gray-700">{label}</span>
        <span className="text-xs font-medium text-gray-700">{value.toFixed(1)}</span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className="h-2 bg-blue-600 rounded-full" 
          style={{ width: widthPercentage }}
        ></div>
      </div>
    </div>
  );
}
