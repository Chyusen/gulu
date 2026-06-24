/**
 * 咕噜 Gulu — MBTI 测试题目与计算逻辑
 * 对应需求文档 2.1 MBTI 测试
 */

import type { MBTIQuestion, MBTIAnswer, MBTIType, ZodiacType, StyleType, CrossMatchResult } from '../types';

/** 8题 MBTI 测试题目 */
export const MBTI_QUESTIONS: MBTIQuestion[] = [
  {
    id: 1,
    dimension: 'EI',
    question: '当你参加社交活动时，你通常...',
    options: [
      { text: '感到兴奋，喜欢认识新朋友', value: 'E' },
      { text: '感到疲惫，更喜欢和熟悉的人待在一起', value: 'I' },
    ],
  },
  {
    id: 2,
    dimension: 'EI',
    question: '在休息的时候，你更倾向于...',
    options: [
      { text: '约朋友一起出去玩', value: 'E' },
      { text: '独自看书、看电影或做自己的事', value: 'I' },
    ],
  },
  {
    id: 3,
    dimension: 'SN',
    question: '当你学习新事物时，你更关注...',
    options: [
      { text: '具体的、实际的事实和细节', value: 'S' },
      { text: '整体的概念、可能性和未来想象', value: 'N' },
    ],
  },
  {
    id: 4,
    dimension: 'SN',
    question: '你更欣赏哪种类型的人？',
    options: [
      { text: '脚踏实地、有常识、动手能力强的人', value: 'S' },
      { text: '富有想象力、有创造力、有远见的人', value: 'N' },
    ],
  },
  {
    id: 5,
    dimension: 'TF',
    question: '当你做决定时，你更倾向于...',
    options: [
      { text: '基于逻辑、客观分析和公平原则', value: 'T' },
      { text: '基于个人价值观、对他人的影响和情感', value: 'F' },
    ],
  },
  {
    id: 6,
    dimension: 'TF',
    question: '当朋友向你倾诉烦恼时，你通常会...',
    options: [
      { text: '帮他分析问题、提供解决方案', value: 'T' },
      { text: '先共情、安慰，让他感受到被理解', value: 'F' },
    ],
  },
  {
    id: 7,
    dimension: 'JP',
    question: '面对一项任务，你更喜欢...',
    options: [
      { text: '制定详细计划，按部就班完成', value: 'J' },
      { text: '保持灵活，边做边调整', value: 'P' },
    ],
  },
  {
    id: 8,
    dimension: 'JP',
    question: '你的生活空间通常是...',
    options: [
      { text: '整洁有序，物品各有归处', value: 'J' },
      { text: '比较随意，乱中有序', value: 'P' },
    ],
  },
];

/** 根据8题答案计算 MBTI 类型 */
export function calculateMBTI(answers: MBTIAnswer[]): MBTIType {
  const dimensions = { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 };
  answers.forEach((a) => {
    dimensions[a.value]++;
  });

  return `${dimensions.E >= dimensions.I ? 'E' : 'I'}${dimensions.S >= dimensions.N ? 'S' : 'N'}${dimensions.T >= dimensions.F ? 'T' : 'F'}${dimensions.J >= dimensions.P ? 'J' : 'P'}` as MBTIType;
}

/** 星座日期范围 */
const ZODIAC_RANGES: { zodiac: ZodiacType; start: [number, number]; end: [number, number] }[] = [
  { zodiac: '摩羯座', start: [12, 22], end: [1, 19] },
  { zodiac: '水瓶座', start: [1, 20], end: [2, 18] },
  { zodiac: '双鱼座', start: [2, 19], end: [3, 20] },
  { zodiac: '白羊座', start: [3, 21], end: [4, 19] },
  { zodiac: '金牛座', start: [4, 20], end: [5, 20] },
  { zodiac: '双子座', start: [5, 21], end: [6, 21] },
  { zodiac: '巨蟹座', start: [6, 22], end: [7, 22] },
  { zodiac: '狮子座', start: [7, 23], end: [8, 22] },
  { zodiac: '处女座', start: [8, 23], end: [9, 22] },
  { zodiac: '天秤座', start: [9, 23], end: [10, 23] },
  { zodiac: '天蝎座', start: [10, 24], end: [11, 22] },
  { zodiac: '射手座', start: [11, 23], end: [12, 21] },
];

/** 根据日期计算星座 */
export function calculateZodiac(month: number, day: number): ZodiacType {
  for (const range of ZODIAC_RANGES) {
    const [startMonth, startDay] = range.start;
    const [endMonth, endDay] = range.end;
    if (startMonth === endMonth) {
      if (month === startMonth && day >= startDay && day <= endDay) {
        return range.zodiac;
      }
    } else {
      // 跨月（如摩羯座跨12月-1月）
      if (
        (month === startMonth && day >= startDay) ||
        (month === endMonth && day <= endDay)
      ) {
        return range.zodiac;
      }
    }
  }
  return '摩羯座';
}

/** MBTI 性格分析文本 */
export const MBTI_ANALYSIS: Record<MBTIType, { analysis: string; strengths: string[]; growthAreas: string[] }> = {
  INFP: {
    analysis: '你是理想主义的调停者，内心温柔而深邃，对世界充满好奇与同理心。',
    strengths: ['共情能力强', '富有创造力', '价值观坚定', '善于倾听'],
    growthAreas: ['容易陷入内耗', '决策时犹豫不决', '过度理想化'],
  },
  INFJ: {
    analysis: '你是深邃的倡导者，洞察人心，致力于让世界变得更好。',
    strengths: ['直觉敏锐', '有远见', '富有同理心', '坚定有原则'],
    growthAreas: ['容易精疲力竭', '过度完美主义', '难以拒绝他人'],
  },
  INTP: {
    analysis: '你是理性的思考者，热爱探索理论与抽象概念，逻辑严密。',
    strengths: ['逻辑思维强', '好奇心旺盛', '客观独立', '善于分析'],
    growthAreas: ['情感表达较弱', '容易忽视细节', '行动力有时不足'],
  },
  INTJ: {
    analysis: '你是独立的建筑师，善于构建系统与战略，追求卓越。',
    strengths: ['战略思维', '独立自主', '决断力强', '追求卓越'],
    growthAreas: ['情感沟通较弱', '对低效缺乏耐心', '过于批判'],
  },
  ISFP: {
    analysis: '你是温柔的艺术家，用感官和美学感受世界，活在当下。',
    strengths: ['审美敏锐', '温和善良', '灵活随性', '富有同情心'],
    growthAreas: ['容易回避冲突', '长期规划较弱', '过于敏感'],
  },
  ISFJ: {
    analysis: '你是温暖的守护者，默默付出，珍视传统与他人的需要。',
    strengths: ['忠诚可靠', '细心体贴', '记忆力好', '有责任感'],
    growthAreas: ['不善表达需求', '过度自我牺牲', '抗拒变化'],
  },
  ISTP: {
    analysis: '你是灵巧的鉴赏家，擅长动手解决问题，冷静而灵活。',
    strengths: ['动手能力强', '冷静理性', '适应力强', '善于应急'],
    growthAreas: ['情感表达不足', '容易厌倦常规', '不愿承诺'],
  },
  ISTJ: {
    analysis: '你是严谨的物流师，重视秩序与事实，是可靠的执行者。',
    strengths: ['责任心强', '条理清晰', '务实可靠', '注重细节'],
    growthAreas: ['不够灵活', '情感表达较弱', '抗拒变化'],
  },
  ENFP: {
    analysis: '你是热情的竞选者，充满灵感与可能性，感染力十足。',
    strengths: ['热情洋溢', '富有创意', '善于交际', '乐观开朗'],
    growthAreas: ['容易分心', '讨厌琐碎细节', '情绪起伏大'],
  },
  ENFJ: {
    analysis: '你是温暖的主人公，天生善于引导他人，富有魅力。',
    strengths: ['富有感染力', '善于引导', '同理心强', '有责任感'],
    growthAreas: ['过度在意他人评价', '容易忽略自己', '理想化他人'],
  },
  ENTP: {
    analysis: '你是机敏的辩论家，热爱思辨与创新，思维敏捷。',
    strengths: ['思维敏捷', '善于辩论', '富有创意', '适应力强'],
    growthAreas: ['容易争辩', '缺乏耐心', '难以坚持'],
  },
  ENTJ: {
    analysis: '你是果断的指挥官，天生的领导者，目标明确。',
    strengths: ['领导力强', '决断力强', '高效执行', '战略思维'],
    growthAreas: ['情感表达不足', '过于强势', '缺乏耐心'],
  },
  ESFP: {
    analysis: '你是活力的表演者，热爱生活，享受当下每一刻。',
    strengths: ['热情开朗', '善于社交', '活在当下', '富有感染力'],
    growthAreas: ['长期规划较弱', '容易冲动', '回避严肃话题'],
  },
  ESFJ: {
    analysis: '你是温暖的执政官，关心他人，营造和谐的氛围。',
    strengths: ['热心助人', '善于照顾他人', '有责任感', '重视和谐'],
    growthAreas: ['过度在意他人看法', '不善处理冲突', '抗拒变化'],
  },
  ESTP: {
    analysis: '你是大胆的企业家，行动派，享受冒险与挑战。',
    strengths: ['行动力强', '善于应变', '勇敢自信', '活在当下'],
    growthAreas: ['缺乏耐心', '长期规划弱', '容易冒险'],
  },
  ESTJ: {
    analysis: '你是务实的总经理，重视秩序与效率，善于组织。',
    strengths: ['组织能力强', '务实高效', '有责任感', '决断力强'],
    growthAreas: ['情感表达不足', '不够灵活', '过于强势'],
  },
};

/** MBTI 推荐视觉风格（Demo 阶段 4 种） */
export const MBTI_STYLE_RECOMMENDATIONS: Record<MBTIType, StyleType[]> = {
  INFP: ['anime', 'realistic', 'pixel'],
  INFJ: ['anime', 'realistic', 'pixel'],
  INTP: ['scifi', 'pixel', 'realistic'],
  INTJ: ['scifi', 'realistic', 'pixel'],
  ISFP: ['anime', 'pixel', 'realistic'],
  ISFJ: ['anime', 'realistic', 'pixel'],
  ISTP: ['realistic', 'pixel', 'scifi'],
  ISTJ: ['realistic', 'pixel', 'anime'],
  ENFP: ['anime', 'pixel', 'realistic'],
  ENFJ: ['anime', 'realistic', 'pixel'],
  ENTP: ['scifi', 'pixel', 'anime'],
  ENTJ: ['scifi', 'realistic', 'pixel'],
  ESFP: ['anime', 'pixel', 'realistic'],
  ESFJ: ['anime', 'realistic', 'pixel'],
  ESTP: ['realistic', 'pixel', 'scifi'],
  ESTJ: ['realistic', 'pixel', 'anime'],
};

/** MBTI 匹配的宠物性格类型 */
export const MBTI_PET_TRAITS: Record<MBTIType, { personalityType: string; description: string }> = {
  INFP: { personalityType: 'dreamer', description: '温柔的理想主义者，与你一同编织梦境' },
  INFJ: { personalityType: 'mystic', description: '深邃的灵魂伴侣，懂你未说出口的心事' },
  INTP: { personalityType: 'thinker', description: '好奇的探索者，与你一起追问世界的本质' },
  INTJ: { personalityType: 'strategist', description: '睿智的伙伴，与你共谋长远' },
  ISFP: { personalityType: 'artist', description: '敏感的艺术家，与你感受生活之美' },
  ISFJ: { personalityType: 'guardian', description: '温柔的守护者，默默陪伴左右' },
  ISTP: { personalityType: 'craftsman', description: '灵巧的匠人，与你一起动手创造' },
  ISTJ: { personalityType: 'keeper', description: '可靠的守护者，与你共建秩序' },
  ENFP: { personalityType: 'spark', description: '热情的小火苗，点燃你的灵感' },
  ENFJ: { personalityType: 'guide', description: '温暖的引路人，与你共同成长' },
  ENTP: { personalityType: 'debater', description: '机敏的辩论家，与你碰撞思想' },
  ENTJ: { personalityType: 'commander', description: '果敢的领袖，与你并肩前行' },
  ESFP: { personalityType: 'performer', description: '活力四射的表演者，与你尽情享乐' },
  ESFJ: { personalityType: 'host', description: '热心的主人，与你温暖相伴' },
  ESTP: { personalityType: 'adventurer', description: '勇敢的冒险家，与你探索世界' },
  ESTJ: { personalityType: 'manager', description: '务实的管家，与你打理生活' },
};

/** MBTI 性格标签与性格说明（用于主界面与详情面板） */
export const MBTI_PERSONALITY: Record<MBTIType, { tag: string; description: string }> = {
  INTJ: {
    tag: '睿智沉静的战略家',
    description: '善于洞察长远，思维缜密而独立。表面冷静，内心却藏着对世界的深邃思考。愿与你一同梳理生活的脉络，在沉静中陪你找到前行的方向。',
  },
  INTP: {
    tag: '好奇内敛的思考者',
    description: '对世界充满好奇，热爱探索理论与抽象。话不多却思维敏捷，会在你迷茫时陪你一起理清思路，用理性为你点亮一盏温暖的小灯。',
  },
  ENTJ: {
    tag: '果敢坚定的引路人',
    description: '目标清晰、行动果敢，天生具有领导气质。会温柔地推你向前，与你并肩跨越每一个难关，做你最坚定的同行者，陪你一起把生活过成想要的模样。',
  },
  ENTP: {
    tag: '机敏灵动的思辨者',
    description: '思维跳跃、热爱思辨，总能从独特角度看问题。愿意和你碰撞思想，也陪你探索生活的无限可能，让平淡的日子也充满新鲜感与惊喜。',
  },
  INFJ: {
    tag: '温柔深邃的守望者',
    description: '洞察人心，富有同理心与远见。能读懂你未说出口的心事，默默守护你内心最柔软的角落，陪你走过情绪的每个起伏，给你最深的理解。',
  },
  INFP: {
    tag: '温柔敏感的梦想家',
    description: '内心温柔而深邃，对世界充满理想与同理心。愿与你一同编织梦境，在诗意中寻找生活的答案，给你最柔软的陪伴与最深的共鸣。',
  },
  ENFJ: {
    tag: '温暖明亮的引路人',
    description: '天生善于引导他人，富有感染力与同理心。会温柔地鼓励你成长，看见你身上每一处闪光点，陪你一步步成为更好的自己，做你最温暖的同行者。',
  },
  ENFP: {
    tag: '热情洋溢的小太阳',
    description: '充满灵感与可能性，感染力十足。总能在你低落时点亮一束光，陪你拥抱生活的每一个惊喜，让平凡的日子也闪闪发亮、充满温度。',
  },
  ISTJ: {
    tag: '严谨可靠的守护者',
    description: '重视秩序与事实，是默默支撑的依靠。会用稳定与踏实为你筑起安全感，陪你一步步走过日常的每个清晨与夜晚，给你最安心的陪伴。',
  },
  ISFJ: {
    tag: '温柔细致的守护者',
    description: '默默付出，珍视他人的需要。细心体贴，会记得你的每一个小习惯与喜好，用温柔的陪伴温暖你的每一天，做你最贴心、最可靠的依靠。',
  },
  ESTJ: {
    tag: '务实稳重的管家',
    description: '重视秩序与效率，善于组织生活。会帮你打理琐碎，让日子井井有条，给你踏实可靠的陪伴与最安心的依靠，做你最稳定的后盾。',
  },
  ESFJ: {
    tag: '热心温暖的陪伴者',
    description: '关心他人，营造和谐氛围。总记得你的喜好与情绪，用细致的关怀让生活充满温度，做你最贴心的同行者，给你最温暖的陪伴。',
  },
  ISTP: {
    tag: '灵巧沉静的匠人',
    description: '擅长动手解决问题，冷静而灵活。话不多却总在关键时刻伸出援手，陪你一起把生活修整妥帖，给你安静而可靠的陪伴与最实在的支持。',
  },
  ISFP: {
    tag: '温柔敏感的艺术家',
    description: '用感官与美学感受世界，活在当下。会陪你发现生活里细微的美，让平凡日子也泛起柔光，给你最温柔、最诗意的陪伴与最深共鸣。',
  },
  ESTP: {
    tag: '大胆活力的冒险家',
    description: '行动派，享受冒险与挑战。会拉着你走出舒适圈，一起在当下尽情体验生活的鲜活与热烈，让平淡的日子也充满动感与活力，陪你尽情尽兴。',
  },
  ESFP: {
    tag: '活力四射的小太阳',
    description: '热爱生活，享受当下每一刻。总能用欢笑感染你，陪你把平凡的日子过得热气腾腾，让每一天都闪闪发光，给你最明亮、最热烈的陪伴。',
  },
};

/** 星座性格关键词 */
const ZODIAC_KEYWORDS: Record<ZodiacType, string[]> = {
  '白羊座': ['勇敢', '冲动', '热情'],
  '金牛座': ['务实', '稳定', '温和'],
  '双子座': ['好奇', '机敏', '多变'],
  '巨蟹座': ['温柔', '敏感', '顾家'],
  '狮子座': ['自信', '热情', '慷慨'],
  '处女座': ['细致', '理性', '完美主义'],
  '天秤座': ['和谐', '优雅', '犹豫'],
  '天蝎座': ['深邃', '敏锐', '专注'],
  '射手座': ['自由', '乐观', '冒险'],
  '摩羯座': ['务实', '自律', '坚韧'],
  '水瓶座': ['独立', '创新', '理想主义'],
  '双鱼座': ['梦幻', '共情', '浪漫'],
};

/** 根据 MBTI 与星座生成交叉匹配结果 */
export function getCrossMatch(mbti: MBTIType, zodiac: ZodiacType): CrossMatchResult {
  const base = MBTI_PET_TRAITS[mbti];
  const zodiacWords = ZODIAC_KEYWORDS[zodiac];

  // 外向 / 内向倾向
  const isExtrovert = mbti.startsWith('E');
  const isFeeler = mbti.includes('F');
  const isIntuitive = mbti.includes('N');

  // 性格关键词组合
  const keywords = isExtrovert
    ? ['外向', '活泼', '热情']
    : ['内向', '安静', '细腻'];
  if (isFeeler) keywords.push('共情');
  if (isIntuitive) keywords.push('梦幻');

  // 对话风格
  const tone: CrossMatchResult['dialogStyle']['tone'] = isExtrovert
    ? 'lively'
    : isFeeler
    ? 'gentle'
    : 'neutral';
  const depth: CrossMatchResult['dialogStyle']['depth'] = isIntuitive
    ? 'deep'
    : 'normal';
  const proactivity: CrossMatchResult['dialogStyle']['proactivity'] = isExtrovert
    ? 'high'
    : isFeeler
    ? 'medium'
    : 'low';

  // 活动偏好
  const activityPreferences: CrossMatchResult['activityPreferences'] = isExtrovert
    ? ['music', 'journal']
    : ['meditation', 'music'];
  if (mbti.includes('J')) activityPreferences.unshift('pomodoro');
  else activityPreferences.push('journal');

  // 食物偏好（使用性格关键词匹配）
  const foodPreferences = (() => {
    if (isExtrovert) return ['star_fruit', 'rainbow_jelly', 'soul_pudding'];
    if (isFeeler) return ['dream_cake', 'moon_tea', 'soul_pudding'];
    if (mbti.includes('T')) return ['star_fruit', 'sun_soup', 'star_soup'];
    return ['cloud_bread', 'dream_cake', 'star_soup'];
  })();

  // 匹配理由文案
  const mbtiName = MBTI_ANALYSIS[mbti]?.analysis.split('，')[0]?.replace('你是', '') ?? mbti;
  const matchReason = `你是 ${mbti} 型${zodiac}——${mbtiName}与${zodiacWords[0]}灵魂的交汇，你的咕噜将是一位${base.description.split('，')[0]}。`;

  return {
    personalityKeywords: keywords,
    dialogStyle: { tone, depth, proactivity },
    foodPreferences,
    activityPreferences,
    matchReason,
  };
}

/** MBTI × 星座 交叉匹配矩阵（运行时生成） */
export const MBTI_ZODIAC_MATRIX: Record<MBTIType, Record<ZodiacType, CrossMatchResult>> = (() => {
  const mbtiTypes: MBTIType[] = [
    'INFP', 'INFJ', 'INTP', 'INTJ',
    'ISFP', 'ISFJ', 'ISTP', 'ISTJ',
    'ENFP', 'ENFJ', 'ENTP', 'ENTJ',
    'ESFP', 'ESFJ', 'ESTP', 'ESTJ',
  ];
  const zodiacs: ZodiacType[] = [
    '白羊座', '金牛座', '双子座', '巨蟹座',
    '狮子座', '处女座', '天秤座', '天蝎座',
    '射手座', '摩羯座', '水瓶座', '双鱼座',
  ];

  const matrix = {} as Record<MBTIType, Record<ZodiacType, CrossMatchResult>>;
  mbtiTypes.forEach((mbti) => {
    matrix[mbti] = {} as Record<ZodiacType, CrossMatchResult>;
    zodiacs.forEach((zodiac) => {
      matrix[mbti][zodiac] = getCrossMatch(mbti, zodiac);
    });
  });

  return matrix;
})();
