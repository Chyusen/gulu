"""
咕噜 Gulu — 长期记忆服务
为每个用户维护 memory.md 文件，记录关键信息、重要事件、情绪模式和偏好。
对应需求文档：长期记忆（memory.md）
"""

import os
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# memory 文件存放目录：backend/memory/
_MEMORY_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "memory",
)


def _ensure_memory_dir() -> None:
    """确保 memory 目录存在，不存在则自动创建。"""
    if not os.path.exists(_MEMORY_DIR):
        os.makedirs(_MEMORY_DIR, exist_ok=True)


def _memory_path(user_id: str) -> str:
    """获取用户 memory 文件路径（防止路径遍历）。"""
    safe_id = user_id.replace("/", "_").replace("\\", "_").replace("..", "_")
    return os.path.join(_MEMORY_DIR, f"{safe_id}.md")


def _default_template() -> str:
    """默认记忆模板。"""
    return """# 用户记忆

## 基本信息
- 昵称：（未知）
- MBTI：（未知）
- 星座：（未知）

## 重要事件

## 情绪模式
- 近期情绪：未知

## 偏好
- 喜欢被称呼为：（未知）
- 喜欢的话题：（未知）
"""


def read_memory(user_id: str) -> str:
    """
    读取用户记忆文件内容。
    - 如果文件不存在，创建带默认模板的空文件并返回模板内容。
    - 返回文件的完整文本内容。
    """
    _ensure_memory_dir()
    path = _memory_path(user_id)
    if not os.path.exists(path):
        template = _default_template()
        try:
            with open(path, "w", encoding="utf-8") as f:
                f.write(template)
        except Exception as e:
            logger.warning(f"创建用户记忆文件失败 ({user_id}): {e}")
        return template
    try:
        with open(path, "r", encoding="utf-8") as f:
            return f.read()
    except Exception as e:
        logger.warning(f"读取用户记忆失败 ({user_id}): {e}")
        return ""


def append_memory(user_id: str, content: str) -> None:
    """
    追加内容到用户记忆文件末尾。
    用于记录每次对话后提取的关键信息。
    """
    _ensure_memory_dir()
    path = _memory_path(user_id)
    # 确保文件存在
    if not os.path.exists(path):
        read_memory(user_id)
    try:
        with open(path, "a", encoding="utf-8") as f:
            f.write(content)
            if not content.endswith("\n"):
                f.write("\n")
    except Exception as e:
        logger.warning(f"追加用户记忆失败 ({user_id}): {e}")


def update_memory_section(user_id: str, section: str, content: str) -> None:
    """
    更新用户记忆文件中的指定章节。
    - 如果章节存在，替换其内容。
    - 如果章节不存在，在文件末尾添加新章节。
    - section: 章节标题（如 "基本信息"、"重要事件"、"情绪模式"、"偏好"）
    - content: 该章节的新内容（不含标题行）
    """
    _ensure_memory_dir()
    path = _memory_path(user_id)

    # 确保文件存在
    if not os.path.exists(path):
        text = _default_template()
        try:
            with open(path, "w", encoding="utf-8") as f:
                f.write(text)
        except Exception as e:
            logger.warning(f"创建用户记忆文件失败 ({user_id}): {e}")
    else:
        try:
            with open(path, "r", encoding="utf-8") as f:
                text = f.read()
        except Exception as e:
            logger.warning(f"读取用户记忆失败 ({user_id}): {e}")
            text = _default_template()

    lines = text.split("\n")
    section_header = f"## {section}"
    new_block = f"{section_header}\n{content}"

    # 查找章节位置
    start_idx: Optional[int] = None
    end_idx: Optional[int] = None
    for i, line in enumerate(lines):
        if line.strip() == section_header:
            start_idx = i
            # 找到下一个 ## 或文件末尾
            for j in range(i + 1, len(lines)):
                if lines[j].startswith("## "):
                    end_idx = j
                    break
            if end_idx is None:
                end_idx = len(lines)
            break

    if start_idx is not None:
        # 替换现有章节内容
        new_lines = lines[:start_idx] + new_block.split("\n") + lines[end_idx:]
        new_text = "\n".join(new_lines)
    else:
        # 追加新章节
        if text and not text.endswith("\n"):
            text += "\n"
        new_text = text + new_block + "\n"

    try:
        with open(path, "w", encoding="utf-8") as f:
            f.write(new_text)
    except Exception as e:
        logger.warning(f"更新用户记忆失败 ({user_id}): {e}")


def get_section_content(text: str, section: str) -> str:
    """
    从记忆文本中提取指定章节的内容（不含标题行）。
    工具函数，供 chat_service 使用。
    """
    lines = text.split("\n")
    section_header = f"## {section}"
    start: Optional[int] = None
    for i, line in enumerate(lines):
        if line.strip() == section_header:
            start = i + 1
            break
    if start is None:
        return ""
    end = len(lines)
    for j in range(start, len(lines)):
        if lines[j].startswith("## "):
            end = j
            break
    return "\n".join(lines[start:end]).strip()
