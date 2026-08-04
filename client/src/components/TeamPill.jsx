export default function TeamPill({ code, name, color }) {
  const defaultColors = {
    ZAM: '#2563eb', BAR: '#dc2626', HAL: '#16a34a',
    SHA: '#9333ea', TEH: '#ea580c', TOW: '#0891b2'
  };
  const bgStyle = color ? { backgroundColor: color } : (defaultColors[code] ? { backgroundColor: defaultColors[code] } : undefined);
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-800 text-sm font-medium">
      <span 
        style={bgStyle}
        className={`w-5 h-5 rounded-full ${!bgStyle ? 'bg-gray-500' : ''} flex items-center justify-center text-white text-[10px] font-bold`}
      >
        {code}
      </span>
      {name}
    </span>
  );
}
