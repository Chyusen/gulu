/**
 * 咕噜 Gulu — 昵称合规审查
 * 对应需求文档 6.1 昵称合规审查
 * Demo 阶段使用本地敏感词库，后续可接入内容审核 API
 */

/** 本地敏感词库：广告、违规、侮辱性词汇 */
const SENSITIVE_WORDS: string[] = [
  // 广告/引流
  '广告', '推广', '营销', '微商', '代购', '加V', '加微信', '加QQ', '加我',
  '扫码', '二维码', '公众号', '小程序', '店铺', '优惠', '折扣', '包邮',
  // 违法违规
  '毒品', '赌博', '博彩', '色情', '卖淫', '嫖娼', '诈骗', '传销', '洗钱',
  // 侮辱歧视
  '傻逼', '弱智', '脑残', '垃圾', '废物', '混蛋', '去死', '滚', '贱', '婊子',
  '蠢货', '神经病', '妈逼', '草泥马', '他妈', 'nmsl', 'cnm', 'sb', 'zz',
];

/** 额外限制：昵称不能为空、过长或过短 */
function hasBasicIssue(nickname: string): { valid: false; reason: string } | null {
  const trimmed = nickname.trim();
  if (trimmed.length === 0) {
    return { valid: false, reason: '昵称不能为空哦～' };
  }
  if (trimmed.length < 1 || trimmed.length > 12) {
    return { valid: false, reason: '昵称长度需要在 1-12 个字符之间～' };
  }
  return null;
}

/**
 * 校验昵称是否合规
 * @returns valid 为 true 时表示通过；否则返回提示文案
 */
export function validateNickname(nickname: string): { valid: true } | { valid: false; reason: string } {
  const basic = hasBasicIssue(nickname);
  if (basic) return basic;

  const lower = nickname.toLowerCase();
  for (const word of SENSITIVE_WORDS) {
    if (lower.includes(word.toLowerCase())) {
      return { valid: false, reason: '这个昵称不太合适哦，换一个试试～' };
    }
  }

  return { valid: true };
}

/**
 * 快捷判断，仅返回是否通过
 */
export function isNicknameValid(nickname: string): boolean {
  return validateNickname(nickname).valid;
}
