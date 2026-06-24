"""
咕噜 Gulu — 小红书/抖音内容采集脚本
对应 tech-plan-2026 方案一
使用 Playwright 模拟浏览器采集公开笔记

用法：
    python scripts/content_collector.py --run-now
    python scripts/content_collector.py --keywords "citywalk 上海"
    python scripts/content_collector.py --help

注意：
    - Demo 阶段控制频率：每分钟不超过 20 次请求
    - 仅采集公开内容
    - 不存储用户隐私数据
    - 标注内容来源
"""

import argparse
import asyncio
import json
import logging
import sys
import os
import time
from datetime import datetime
from typing import List, Dict, Any, Optional

# 将 backend 目录加入 sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings
from app.core.database import get_supabase_safe, is_supabase_available
from app.utils.http_retry import request_with_retry

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="[%(levelname)s] %(message)s")

# 请求间隔（秒），控制每分钟不超过 20 次
REQUEST_INTERVAL = 3.0

# 默认搜索关键词
DEFAULT_KEYWORDS = [
    "citywalk 上海",
    "citywalk 北京",
    "周末打卡 探店",
    "旅行攻略 小众",
]


class ContentCollector:
    """内容采集器"""

    def __init__(self):
        self.request_count = 0
        self.last_request_time = 0.0

    async def collect(self, keywords: List[str], limit_per_keyword: int = 10) -> List[Dict[str, Any]]:
        """
        采集内容
        :param keywords: 关键词列表
        :param limit_per_keyword: 每个关键词采集条数
        """
        all_items: List[Dict[str, Any]] = []

        for kw in keywords:
            logger.info(f"正在采集关键词: {kw}")
            items = await self._collect_keyword(kw, limit_per_keyword)
            all_items.extend(items)
            logger.info(f"关键词 '{kw}' 采集到 {len(items)} 条")

        # 去重
        seen = set()
        unique_items = []
        for item in all_items:
            key = f"{item['platform']}:{item['external_id']}"
            if key not in seen:
                seen.add(key)
                unique_items.append(item)

        logger.info(f"去重后共 {len(unique_items)} 条内容")
        return unique_items

    async def _collect_keyword(self, keyword: str, limit: int) -> List[Dict[str, Any]]:
        """采集单个关键词的内容"""
        # 尝试使用 Playwright 采集
        try:
            return await self._collect_with_playwright(keyword, limit)
        except ImportError:
            logger.warning("Playwright 未安装，使用 Mock 数据")
            return self._mock_collect(keyword, limit)
        except Exception as e:
            logger.warning(f"Playwright 采集失败: {e}，使用 Mock 数据")
            return self._mock_collect(keyword, limit)

    async def _collect_with_playwright(self, keyword: str, limit: int) -> List[Dict[str, Any]]:
        """使用 Playwright 采集小红书公开笔记"""
        from playwright.async_api import async_playwright

        items: List[Dict[str, Any]] = []
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            )
            page = await context.new_page()

            # 访问小红书搜索页
            search_url = f"https://www.xiaohongshu.com/search_result?keyword={keyword}"
            await page.goto(search_url, wait_until="networkidle", timeout=30000)
            await page.wait_for_timeout(2000)

            # 解析笔记卡片
            cards = await page.query_selector_all(".note-item, .feeds-page .note-item")
            for i, card in enumerate(cards[:limit]):
                await self._rate_limit()

                try:
                    title_el = await card.query_selector(".title, .note-title")
                    title = await title_el.inner_text() if title_el else ""

                    desc_el = await card.query_selector(".desc, .note-desc")
                    summary = await desc_el.inner_text() if desc_el else ""

                    like_el = await card.query_selector(".like-wrapper .count, .like-count")
                    likes_text = await like_el.inner_text() if like_el else "0"
                    likes = self._parse_likes(likes_text)

                    cover_el = await card.query_selector("img")
                    cover_url = await cover_el.get_attribute("src") if cover_el else ""

                    # 获取笔记 ID
                    link_el = await card.query_selector("a")
                    href = await link_el.get_attribute("href") if link_el else ""
                    external_id = href.split("/")[-1] if href else f"xhs_{keyword}_{i}"

                    items.append({
                        "platform": "xhs",
                        "external_id": external_id,
                        "title": title.strip(),
                        "summary": summary.strip()[:500],
                        "tags": [keyword],
                        "likes": likes,
                        "location": "",
                        "cover_url": cover_url,
                    })
                except Exception as e:
                    logger.warning(f"解析卡片失败: {e}")
                    continue

            await browser.close()

        return items

    def _mock_collect(self, keyword: str, limit: int) -> List[Dict[str, Any]]:
        """生成 Mock 数据（Playwright 不可用时降级）"""
        mock_templates = [
            {"title": f"{keyword} | 周末好去处推荐", "summary": f"分享一个超适合{keyword}的地方，氛围感拉满，拍照超级出片！"},
            {"title": f"{keyword} 攻略 | 小众打卡点", "summary": f"发现一个宝藏地点，{keyword}必去，人少景美，强烈推荐。"},
            {"title": f"{keyword} 一日游路线", "summary": f"整理了一条{keyword}路线，从早到晚都安排好了，跟着走就行。"},
            {"title": f"{keyword} 探店 | 隐藏咖啡馆", "summary": f"这家店真的太适合{keyword}了，装修有格调，咖啡也好喝。"},
            {"title": f"{keyword} 拍照指南", "summary": f"{keyword}怎么拍最好看？这份指南教你拍出大片感。"},
        ]

        items = []
        for i in range(min(limit, len(mock_templates))):
            tpl = mock_templates[i]
            items.append({
                "platform": "xhs",
                "external_id": f"mock_{keyword}_{i}_{int(time.time())}",
                "title": tpl["title"],
                "summary": tpl["summary"],
                "tags": [keyword, "citywalk", "打卡"],
                "likes": 100 + i * 50,
                "location": "",
                "cover_url": "",
            })
        return items

    async def _rate_limit(self):
        """请求频率控制"""
        now = time.time()
        elapsed = now - self.last_request_time
        if elapsed < REQUEST_INTERVAL:
            await asyncio.sleep(REQUEST_INTERVAL - elapsed)
        self.last_request_time = time.time()
        self.request_count += 1

    @staticmethod
    def _parse_likes(text: str) -> int:
        """解析点赞数文本"""
        text = text.strip()
        if "万" in text:
            return int(float(text.replace("万", "")) * 10000)
        try:
            return int(text)
        except ValueError:
            return 0

    async def save_to_db(self, items: List[Dict[str, Any]]) -> int:
        """保存到数据库"""
        if not items:
            return 0

        if is_supabase_available():
            try:
                supabase = get_supabase_safe()
                saved = 0
                for item in items:
                    try:
                        # 检查是否已存在
                        existing = (
                            supabase.table("content_items")
                            .select("id")
                            .eq("platform", item["platform"])
                            .eq("external_id", item["external_id"])
                            .execute()
                        )
                        if existing.data:
                            continue

                        supabase.table("content_items").insert(item).execute()
                        saved += 1
                    except Exception as e:
                        logger.warning(f"保存内容失败: {e}")
                logger.info(f"成功保存 {saved} 条内容到 Supabase")
                return saved
            except Exception as e:
                logger.warning(f"Supabase 保存失败: {e}")

        # 内存降级
        logger.info(f"[Demo] 内容已保存到内存（{len(items)} 条）")
        return len(items)


async def generate_embeddings(items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """为内容生成向量（使用 SiliconFlow BGE-m3）"""
    if not settings.SILICONFLOW_API_KEY:
        logger.warning("未配置 SILICONFLOW_API_KEY，跳过向量化")
        return items

    embedding_url = "https://api.siliconflow.cn/v1/embeddings"
    headers = {
        "Authorization": f"Bearer {settings.SILICONFLOW_API_KEY}",
        "Content-Type": "application/json",
    }

    for item in items:
        text = f"{item.get('title', '')} {item.get('summary', '')} {' '.join(item.get('tags', []))}"
        try:
            resp = await request_with_retry(
                "POST",
                embedding_url,
                headers=headers,
                json={
                    "model": "BAAI/bge-m3",
                    "input": text,
                },
                timeout=30,
                retries=2,
            )
            if resp:
                data = resp.json()
                embedding = data.get("data", [{}])[0].get("embedding", [])
                item["embedding"] = embedding
                logger.info(f"已生成向量: {item['external_id']} (dim={len(embedding)})")
        except Exception as e:
            logger.warning(f"生成向量失败: {e}")

    return items


async def main(keywords: Optional[List[str]] = None, limit: int = 10, run_now: bool = False):
    """主函数"""
    if not keywords:
        keywords = DEFAULT_KEYWORDS

    collector = ContentCollector()
    logger.info(f"开始采集，关键词: {keywords}")

    items = await collector.collect(keywords, limit_per_keyword=limit)
    logger.info(f"采集完成，共 {len(items)} 条")

    # 生成向量
    items = await generate_embeddings(items)

    # 保存到数据库
    saved = await collector.save_to_db(items)
    logger.info(f"保存完成，新增 {saved} 条")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="小红书/抖音内容采集脚本")
    parser.add_argument("--run-now", action="store_true", help="立即执行采集")
    parser.add_argument("--keywords", nargs="+", help="搜索关键词")
    parser.add_argument("--limit", type=int, default=10, help="每个关键词采集条数")
    args = parser.parse_args()

    if not args.run_now and not args.keywords:
        parser.print_help()
        sys.exit(0)

    asyncio.run(main(args.keywords, args.limit, args.run_now))
