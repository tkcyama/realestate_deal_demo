const KANJI_DIGIT: Record<string, number> = {
  '〇': 0, '一': 1, '二': 2, '三': 3, '四': 4,
  '五': 5, '六': 6, '七': 7, '八': 8, '九': 9,
}

function kanjiSeqToNumber(match: string): string {
  let total = 0
  let current = 0
  for (const ch of match) {
    if (ch === '千') { total += (current || 1) * 1000; current = 0 }
    else if (ch === '百') { total += (current || 1) * 100; current = 0 }
    else if (ch === '十') { total += (current || 1) * 10; current = 0 }
    else { current = KANJI_DIGIT[ch] ?? 0 }
  }
  return String(total + current)
}

export function normalizeAddress(s: string): string {
  // 全角英数字・記号 → 半角
  let r = s.replace(/[Ａ-Ｚａ-ｚ０-９－ー−]/g, (c) => {
    const code = c.charCodeAt(0)
    if (code === 0xFF0D || code === 0x30FC || code === 0x2212) return '-'
    return String.fromCharCode(code - 0xFEE0)
  })
  // 漢数字（千百十一〜九〇）の連続 → 半角数字（三丁目→3丁目、十二→12 等）
  r = r.replace(/[〇一二三四五六七八九十百千]+/g, kanjiSeqToNumber)
  // 番(地)?数字(号) → ハイフン区切り（39番7号・39番地7号 → 39-7）
  // ※ 号館・号室などは「番」の前に数字がない場合なので影響しない
  r = r.replace(/(\d+)番地?(\d+)号?/g, '$1-$2')
  // 上記で変換されなかった「番地」を除去（39番地 → 39）※番町など地名は対象外
  r = r.replace(/(\d+)番地(?=\D|$)/g, '$1')
  // 連続ハイフンを1つに統一、末尾ハイフンを除去
  r = r.replace(/-{2,}/g, '-').replace(/-+$/, '')
  return r.trim()
}
