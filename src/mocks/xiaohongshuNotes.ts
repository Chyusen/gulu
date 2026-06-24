/**
 * 咕噜 Gulu — 小红书热门笔记 Mock 数据
 * 对应需求文档 4.2 附近热门笔记
 */

export interface XiaohongshuNote {
  id: string;
  title: string;
  summary: string;
  tag: '美食' | '旅游' | '探店' | 'Citywalk';
  likes: number;
  distance: number;
  lat: number;
  lng: number;
  author: string;
  imageEmoji: string;
}

const TAGS: XiaohongshuNote['tag'][] = ['美食', '旅游', '探店', 'Citywalk'];
const TITLES: Record<XiaohongshuNote['tag'], string[]> = {
  美食: ['巷子里藏着一碗治愈系拉面', '这家甜品店的蛋糕像云朵', '深夜食堂的暖胃汤饭'],
  旅游: ['周末去公园发呆才是正经事', ' city 角落里的秘密花园', '一条通往湖边的小路'],
  探店: ['藏在二楼的独立书店', '这家咖啡馆有小猫', '手作工坊的午后时光'],
  Citywalk: ['用一万步认识这条老街', '夕阳下的滨江步道', '梧桐树下的散步路线'],
};

const EMOJIS = ['🍜', '🍰', '📚', '🌳', '🐈', '🌅', '🚶', '🍵'];

export const MOCK_XIAOHONGSHU_NOTES: XiaohongshuNote[] = Array.from({ length: 6 }, (_, i) => {
  const tag = TAGS[i % TAGS.length];
  const title = TITLES[tag][i % TITLES[tag].length];
  return {
    id: `note-${i}`,
    title,
    summary: `${title}，适合和咕噜一起慢慢逛～`,
    tag,
    likes: Math.floor(Math.random() * 900) + 50,
    distance: Math.floor(Math.random() * 900) + 100,
    lat: 31.23 + (Math.random() - 0.5) * 0.02,
    lng: 121.47 + (Math.random() - 0.5) * 0.02,
    author: `探索者 ${i + 1}`,
    imageEmoji: EMOJIS[i % EMOJIS.length],
  };
});

export function getXiaohongshuNotes(): XiaohongshuNote[] {
  return MOCK_XIAOHONGSHU_NOTES;
}
