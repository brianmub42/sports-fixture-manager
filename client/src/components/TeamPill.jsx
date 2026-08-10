export default function TeamPill({ code, name, color, logoUrl, size }) {
  const isLg = size === 'lg';
  const defaultColors = {
    ZAM: '#2563eb', BAR: '#dc2626', HAL: '#16a34a',
    SHA: '#9333ea', TEH: '#ea580c', TOW: '#0891b2'
  };
  const bgStyle = color ? { backgroundColor: color } : (defaultColors[code] ? { backgroundColor: defaultColors[code] } : undefined);
  return (
    <span className={`inline-flex items-center ${isLg ? 'gap-3 px-3.5 py-2 text-xl' : 'gap-1.5 px-2 py-1 text-sm'} rounded-md bg-gray-100 dark:bg-gray-800 font-medium`}>
      {logoUrl ? (
        <img src={logoUrl} alt={name} className={`${isLg ? 'w-8 h-8' : 'w-5 h-5'} rounded-full object-cover`} onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
      ) : null}
      <span 
        style={bgStyle}
        className={`${isLg ? 'w-8 h-8 text-xs' : 'w-5 h-5 text-[10px]'} rounded-full ${!bgStyle ? 'bg-gray-500' : ''} ${logoUrl ? 'hidden' : 'flex'} items-center justify-center text-white font-bold`}
      >
        {code}
      </span>
      {name}
    </span>
  );
}
