// 数据脱敏：对值做模糊打码（如手机号中间几位打 *）。
// 规则：
//  - 长度 <= 4          -> 全部打码
//  - 长度 5~7           -> 保留首位和末位，中间打码
//  - 长度 >= 8          -> 保留前 3 位和后 4 位，中间打码（适合手机号 138****5678）
export function maskValue(raw: unknown): string {
  if (raw === null || raw === undefined) return '';
  const s = String(raw);
  if (s.length === 0) return s;
  if (s.length <= 4) return '*'.repeat(s.length);
  if (s.length <= 7) return s[0] + '*'.repeat(s.length - 2) + s[s.length - 1];
  return s.slice(0, 3) + '*'.repeat(s.length - 7) + s.slice(s.length - 4);
}
