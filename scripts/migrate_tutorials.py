import argparse
import os
import re
import shutil
from pathlib import Path
from datetime import datetime
from urllib.parse import unquote

def to_slug(value: str) -> str:
    value = value.lower()
    value = re.sub(r'[^a-z0-9]+', '-', value)
    return value.strip('-')

def parse_summary(summary_path: Path):
    lines = summary_path.read_text(encoding="utf-8").splitlines()
    
    series_list = []
    current_series = None
    series_order = 0
    
    for line in lines:
        # Match series headers like "## 0. Web Foundations" or "## BONUS"
        header_match = re.match(r'^##\s+(?:(\d+)\.\s+)?(.+)$', line)
        if header_match:
            if header_match.group(1):
                series_order = int(header_match.group(1))
            else:
                series_order += 1
            current_series = {"title": header_match.group(2).strip(), "order": series_order, "files": []}
            series_list.append(current_series)
            continue
            
        # Match links like "* [0.1 - DNS Basic](README.md)" or "* [Note](bonus/note.md)"
        link_match = re.match(r'^\*\s+\[(.*?)\]\((.*?)\)$', line)
        if link_match and current_series is not None:
            title = link_match.group(1).strip()
            path = link_match.group(2).strip()
            current_series["files"].append({"title": title, "path": path})
            
    return series_list

# Convert GitBook hints
def convert_hints(content: str) -> str:
    pattern = re.compile(r'{%\s*hint\s+style="([^"]+)"\s*%}\n(.*?){%\s*endhint\s*%}', re.DOTALL)
    def replacer(match):
        style = match.group(1).upper()
        # map styles
        if style == "SUCCESS": style = "SUCCESS"
        elif style == "DANGER": style = "ERROR"
        elif style == "INFO": style = "INFO"
        elif style == "WARNING": style = "WARNING"
        
        text = match.group(2).strip()
        lines = text.split('\n')
        callout_lines = [f"> [!{style}]"] + [f"> {line}" for line in lines]
        return "\n".join(callout_lines) + "\n"
    return pattern.sub(replacer, content)

def extract_title(content: str, default: str) -> tuple[str, str]:
    match = re.search(r'^#\s+(.+)$', content, re.MULTILINE)
    if match:
        title = match.group(1).strip()
        # Remove the title from content
        content = content[:match.start()] + content[match.end():]
        return title.replace('"', '\\"'), content.strip()
    return default.replace('"', '\\"'), content

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--source', required=True, help='Path to gitbook repo')
    parser.add_argument('--output', required=True, help='Output astro blog collection path')
    args = parser.parse_args()

    source_dir = Path(args.source)
    out_dir = Path(args.output)
    assets_dir = source_dir / ".gitbook" / "assets"
    
    summary_path = source_dir / "SUMMARY.md"
    if not summary_path.exists():
        print("SUMMARY.md not found!")
        return

    series_list = parse_summary(summary_path)
    
    imported = 0
    date_str = datetime.now().strftime("%Y-%m-%d")

    for series in series_list:
        s_title = series["title"]
        s_order = series["order"]
        for f in series["files"]:
            file_path = source_dir / f["path"]
            if not file_path.exists():
                print(f"File missing: {file_path}")
                continue
                
            content = file_path.read_text(encoding="utf-8")
            title, content = extract_title(content, f["title"])
            content = convert_hints(content)
            
            # create bundle folder name from file name
            bundle_name = file_path.stem
            if bundle_name.lower() == "readme":
                # fallback to title if it's a readme
                bundle_name = to_slug(title)
                
            bundle_dir = out_dir / bundle_name
            bundle_dir.mkdir(parents=True, exist_ok=True)
            
            # handle images
            img_pattern = re.compile(r'!\[([^\]]*)\]\((.*?)\)')
            def img_replacer(match):
                alt = match.group(1)
                src = match.group(2)
                # handle both .gitbook/assets/ and ../../.gitbook/assets/
                if "assets/" in src:
                    img_name = src.split("/")[-1]
                    img_name_unquoted = unquote(img_name)
                    
                    img_src = assets_dir / img_name_unquoted
                    if img_src.exists():
                        target_img_dir = bundle_dir / "images"
                        target_img_dir.mkdir(exist_ok=True)
                        shutil.copy2(img_src, target_img_dir / img_name_unquoted)
                        return f"![{alt}](./images/{img_name})"
                return match.group(0)

            content = img_pattern.sub(img_replacer, content)
            
            html_img_pattern = re.compile(r'<img[^>]+src=["\']([^"\']+)["\'][^>]*>')
            def html_img_replacer(match):
                src = match.group(1)
                full_tag = match.group(0)
                if "assets/" in src:
                    img_name = src.split("/")[-1]
                    img_name_unquoted = unquote(img_name)
                    img_src = assets_dir / img_name_unquoted
                    if img_src.exists():
                        target_img_dir = bundle_dir / "images"
                        target_img_dir.mkdir(exist_ok=True)
                        shutil.copy2(img_src, target_img_dir / img_name_unquoted)
                        return full_tag.replace(src, f"./images/{img_name}")
                return full_tag
            content = html_img_pattern.sub(html_img_replacer, content)

            frontmatter = f"""---
title: "{title}"
date: {date_str}
category: "Tutorial"
series: "{s_title}"
seriesOrder: {s_order}
tags: []
draft: false
---

"""
            (bundle_dir / "index.md").write_text(frontmatter + content, encoding="utf-8")
            imported += 1
            print(f"Imported: {bundle_name}")

    print(f"\nDone! Imported {imported} files.")

if __name__ == "__main__":
    main()
