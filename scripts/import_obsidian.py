#!/usr/bin/env python3
from __future__ import annotations

import argparse
import re
import shutil
from datetime import date
from pathlib import Path


def to_title_case(value: str) -> str:
    parts = re.split(r"[\s_-]+", value.strip())
    parts = [p for p in parts if p]
    return " ".join(p[:1].upper() + p[1:].lower() for p in parts)


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower())
    return re.sub(r"^-+|-+$", "", slug)


def platform_prefix(platform: str) -> str:
    normalized = platform.lower()
    if "hackthebox" in normalized:
        return "htb"
    if "portswigger" in normalized:
        return "portswigger"
    return slugify(platform)


def normalize_image_path(raw_target: str) -> str:
    cleaned = raw_target.strip().strip("'\"")
    if cleaned.startswith(("http://", "https://", "data:", "#")):
        return cleaned

    no_dot_prefix = re.sub(r"^\./", "", cleaned)
    if no_dot_prefix.startswith("images/"):
        return f"./{no_dot_prefix}"
    if "/" not in no_dot_prefix:
        return f"./images/{no_dot_prefix}"
    return f"./{no_dot_prefix}"


def fix_image_links(content: str) -> str:
    wiki_pattern = re.compile(r"!\[\[([^\]|]+)(?:\|([^\]]+))?\]\]")
    md_pattern = re.compile(r"!\[([^\]]*)\]\(([^)]+)\)")

    def replace_wiki(match: re.Match[str]) -> str:
        target = match.group(1)
        alt = match.group(2) or Path(target).stem
        return f"![{alt}]({normalize_image_path(target)})"

    def replace_md(match: re.Match[str]) -> str:
        alt = match.group(1)
        target = match.group(2)
        return f"![{alt}]({normalize_image_path(target)})"

    content = wiki_pattern.sub(replace_wiki, content)
    content = md_pattern.sub(replace_md, content)
    return content


def parse_source_metadata(source_dir: Path) -> dict[str, str]:
    challenge = source_dir.name
    category = source_dir.parent.name
    challenges_folder = source_dir.parent.parent.name if source_dir.parent.parent else ""
    platform = re.sub(r"\s*challenges\s*$", "", challenges_folder, flags=re.IGNORECASE) or "Unknown"
    return {
        "title": challenge,
        "category_raw": category,
        "category": to_title_case(category),
        "platform": platform,
    }


def frontmatter_block(meta: dict[str, str], post_date: str) -> str:
    return "\n".join(
        [
            "---",
            f'title: "{meta["title"]}"',
            f"date: {post_date}",
            f'platform: "{meta["platform"]}"',
            f'category: "{meta["category"]}"',
            'difficulty: "Medium"',
            f'tags: ["{slugify(meta["category_raw"])}", "{slugify(meta["platform"])}"]',
            "draft: false",
            "---",
            "",
        ]
    )


def find_challenge_dirs(root_dir: Path) -> list[Path]:
    found: list[Path] = []
    for readme in root_dir.rglob("README.md"):
        found.append(readme.parent)
    return sorted(found)


def import_one(source_dir: Path, out_root: Path, post_date: str, overwrite: bool) -> tuple[bool, Path]:
    readme_path = source_dir / "README.md"
    images_path = source_dir / "images"
    if not readme_path.exists():
        raise FileNotFoundError(f"README.md not found at: {readme_path}")

    meta = parse_source_metadata(source_dir)
    bundle_slug = f'{platform_prefix(meta["platform"])}-{slugify(meta["category_raw"])}-{slugify(meta["title"])}'
    bundle_dir = out_root / bundle_slug
    index_path = bundle_dir / "index.mdx"

    if bundle_dir.exists():
        if not overwrite:
            return False, bundle_dir
        shutil.rmtree(bundle_dir)

    bundle_dir.mkdir(parents=True, exist_ok=True)

    if images_path.exists():
        shutil.copytree(images_path, bundle_dir / "images")

    content = readme_path.read_text(encoding="utf-8")
    content = fix_image_links(content)

    if not content.lstrip().startswith("---"):
        content = f"{frontmatter_block(meta, post_date)}\n{content}"

    index_path.write_text(content, encoding="utf-8")
    return True, bundle_dir


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Import Obsidian CTF writeups into Astro content page bundles."
    )
    parser.add_argument("--source", required=True, help="Path to challenge folder or CTF root folder")
    parser.add_argument("--out", default="src/content/ctf", help="Output root for Astro CTF content")
    parser.add_argument("--date", default=str(date.today()), help="Frontmatter date (YYYY-MM-DD)")
    parser.add_argument("--overwrite", action="store_true", help="Overwrite existing destination bundles")
    parser.add_argument("--bulk", action="store_true", help="Import all README.md challenge folders recursively")
    args = parser.parse_args()

    source = Path(args.source).resolve()
    out_root = Path(args.out).resolve()

    if not source.exists():
        raise SystemExit(f"Source path does not exist: {source}")

    if args.bulk:
        challenge_dirs = find_challenge_dirs(source)
        if not challenge_dirs:
            raise SystemExit(f"No README.md challenge folders found under: {source}")

        imported = 0
        skipped = 0
        for challenge_dir in challenge_dirs:
            try:
                did_import, bundle_dir = import_one(
                    challenge_dir, out_root, args.date, overwrite=args.overwrite
                )
                if did_import:
                    imported += 1
                    print(f"Imported: {bundle_dir}")
                else:
                    skipped += 1
                    print(f"Skipped: {bundle_dir}")
            except Exception as exc:
                print(f"Failed: {challenge_dir}")
                print(str(exc))

        print(f"Done. Imported: {imported}, Skipped: {skipped}, Total: {len(challenge_dirs)}")
        return

    did_import, bundle_dir = import_one(source, out_root, args.date, overwrite=args.overwrite)
    if did_import:
        print(f"Imported: {bundle_dir}")
    else:
        print(f"Skipped (exists): {bundle_dir}")


if __name__ == "__main__":
    main()
