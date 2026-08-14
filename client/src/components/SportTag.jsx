export default function SportTag({ sport, size }) {
  const isLg = size === 'lg';
  const styles = {
    Basketball: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    Volleyball: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    Soccer: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    'Tug of War': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    Athletics: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
    Novelty: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  };

  const abbrev = {
    Basketball: 'BB',
    Volleyball: 'VB',
    Soccer: 'SC',
    'Tug of War': 'TOW',
    Athletics: 'ATH',
    Novelty: 'NOV'
  };

  const getStyle = (name) => {
    if (!name) return styles.Athletics;
    if (styles[name]) return styles[name];
    
    // Hash name to pick a stable color style
    const keys = Object.keys(styles);
    const sum = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    return styles[keys[sum % keys.length]];
  };

  const getAbbrev = (name) => {
    if (!name) return '';
    if (abbrev[name]) return abbrev[name];
    if (name.includes(' ')) {
      return name.split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 3);
    }
    return name.substring(0, 3).toUpperCase();
  };

  return (
    <span className={`inline-flex items-center ${isLg ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-xs'} rounded-md font-semibold ${getStyle(sport)}`}>
      {getAbbrev(sport)}
    </span>
  );
}
