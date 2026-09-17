export const STATUS_ENGINE_VERSION = 'GLOW-STATUS-V1.0';

export function dimensionStatus(score) {
  const n = Number(score);
  if (!Number.isInteger(n) || n < 0 || n > 100) throw new Error('Score must be an integer from 0 to 100');
  if (n >= 70) return 'STRENGTH';
  if (n >= 65) return 'DEVELOPING';
  if (n >= 55) return 'FOCUS';
  return 'PRIORITY';
}

export function overallBand(score) {
  const n = Number(score);
  if (!Number.isInteger(n) || n < 0 || n > 100) throw new Error('Score must be an integer from 0 to 100');
  if (n >= 85) return 'Exceptional Glow';
  if (n >= 70) return 'Strong Glow';
  if (n >= 55) return 'Developing Glow';
  if (n >= 40) return 'Glow Reset';
  return 'Glow Reboot';
}