export const ZODIAC_SIGNS = {
  Aries: { symbol: '♈', emoji: '🐏', element: 'Fire', color: '#FF6B6B' },
  Taurus: { symbol: '♉', emoji: '🐂', element: 'Earth', color: '#4ECDC4' },
  Gemini: { symbol: '♊', emoji: '👯', element: 'Air', color: '#FFE66D' },
  Cancer: { symbol: '♋', emoji: '🦀', element: 'Water', color: '#95E1D3' },
  Leo: { symbol: '♌', emoji: '🦁', element: 'Fire', color: '#F38181' },
  Virgo: { symbol: '♍', emoji: '👸', element: 'Earth', color: '#AA96DA' },
  Libra: { symbol: '♎', emoji: '⚖️', element: 'Air', color: '#FCBAD3' },
  Scorpio: { symbol: '♏', emoji: '🦂', element: 'Water', color: '#8B5CF6' },
  Sagittarius: { symbol: '♐', emoji: '🏹', element: 'Fire', color: '#FF9F43' },
  Capricorn: { symbol: '♑', emoji: '🐐', element: 'Earth', color: '#6C5B7B' },
  Aquarius: { symbol: '♒', emoji: '🌊', element: 'Air', color: '#45B7D1' },
  Pisces: { symbol: '♓', emoji: '🐟', element: 'Water', color: '#96CEB4' },
};

export const getZodiacInfo = (sign: string) => {
  return ZODIAC_SIGNS[sign as keyof typeof ZODIAC_SIGNS] || { symbol: '?', emoji: '❓', element: 'Unknown', color: '#888888' };
};

export const DATE_TYPES = {
  cena: { label: 'Cena', emoji: '🍽️', description: 'Una cena romántica' },
  baile: { label: 'Baile', emoji: '💃', description: 'Noche de baile' },
  cine: { label: 'Cine', emoji: '🎬', description: 'Película y palomitas' },
};
