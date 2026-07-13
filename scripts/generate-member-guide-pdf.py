from __future__ import annotations

import argparse
import html
import re
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.colors import HexColor
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    KeepTogether,
    PageBreak,
    Paragraph,
    Preformatted,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs" / "member-guide-ja.md"
OUTPUT = ROOT / "docs" / "member-guide-ja.pdf"
FONT = Path("C:/Windows/Fonts/NotoSansJP-VF.ttf")

BLUE = HexColor("#2E74B5")
DARK_BLUE = HexColor("#1F4D78")
INK = HexColor("#0B2545")
MUTED = HexColor("#5F6B76")
CALL_OUT = HexColor("#F4F6F9")
CAUTION = HexColor("#FFF4E5")
TABLE_HEADER = HexColor("#E8EEF5")


def inline(text: str) -> str:
    escaped = html.escape(text)
    escaped = re.sub(r"`([^`]+)`", r'<font name="NotoSansJP" color="#0B2545">\1</font>', escaped)
    escaped = re.sub(r"\*\*([^*]+)\*\*", r"<b>\1</b>", escaped)
    escaped = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r'<link href="\2" color="#2E74B5">\1</link>', escaped)
    return escaped


def table_row(line: str) -> list[str]:
    return [cell.strip() for cell in line.strip().strip("|").split("|")]


def build_styles() -> dict[str, ParagraphStyle]:
    styles = getSampleStyleSheet()
    base = dict(fontName="NotoSansJP", fontSize=10.5, leading=16, textColor=INK, wordWrap="CJK")
    return {
        "body": ParagraphStyle("GuideBody", parent=styles["BodyText"], spaceAfter=6, **base),
        "title": ParagraphStyle("GuideTitle", parent=styles["Title"], alignment=TA_CENTER, fontName="NotoSansJP", fontSize=23, leading=30, textColor=INK, spaceAfter=8),
        "quick_title": ParagraphStyle("QuickGuideTitle", parent=styles["Title"], alignment=TA_CENTER, fontName="NotoSansJP", fontSize=18, leading=24, textColor=INK, spaceAfter=4),
        "subtitle": ParagraphStyle("GuideSubtitle", parent=styles["BodyText"], alignment=TA_CENTER, fontName="NotoSansJP", fontSize=11, leading=16, textColor=MUTED, spaceAfter=8, wordWrap="CJK"),
        "h1": ParagraphStyle("GuideH1", parent=styles["Heading1"], fontName="NotoSansJP", fontSize=16, leading=23, textColor=BLUE, spaceBefore=18, spaceAfter=10, wordWrap="CJK", keepWithNext=1),
        "h1_breakable": ParagraphStyle("GuideH1Breakable", parent=styles["Heading1"], fontName="NotoSansJP", fontSize=16, leading=23, textColor=BLUE, spaceBefore=18, spaceAfter=10, wordWrap="CJK"),
        "h2": ParagraphStyle("GuideH2", parent=styles["Heading2"], fontName="NotoSansJP", fontSize=13, leading=19, textColor=BLUE, spaceBefore=14, spaceAfter=7, wordWrap="CJK", keepWithNext=1),
        "quick_body": ParagraphStyle("QuickGuideBody", parent=styles["BodyText"], fontName="NotoSansJP", fontSize=10, leading=14, textColor=INK, spaceAfter=5, wordWrap="CJK"),
        "quick_h1": ParagraphStyle("QuickGuideH1", parent=styles["Heading1"], fontName="NotoSansJP", fontSize=15, leading=20, textColor=BLUE, spaceBefore=12, spaceAfter=7, wordWrap="CJK", keepWithNext=1),
        "quick_h2": ParagraphStyle("QuickGuideH2", parent=styles["Heading2"], fontName="NotoSansJP", fontSize=12, leading=17, textColor=BLUE, spaceBefore=10, spaceAfter=5, wordWrap="CJK", keepWithNext=1),
        "quick_list": ParagraphStyle("QuickGuideList", parent=styles["BodyText"], fontName="NotoSansJP", fontSize=10, leading=14, textColor=INK, leftIndent=20, firstLineIndent=-12, spaceAfter=3, wordWrap="CJK"),
        "code": ParagraphStyle("GuideCode", parent=styles["Code"], fontName="NotoSansJP", fontSize=8.5, leading=12, textColor=INK, backColor=HexColor("#F8FAFC"), borderColor=HexColor("#D7DEE8"), borderWidth=0.5, borderPadding=8, leftIndent=8, rightIndent=8, spaceBefore=4, spaceAfter=8, wordWrap="CJK"),
        "small": ParagraphStyle("GuideSmall", parent=styles["BodyText"], fontName="NotoSansJP", fontSize=9, leading=13, textColor=MUTED, wordWrap="CJK"),
        "list": ParagraphStyle("GuideList", parent=styles["BodyText"], fontName="NotoSansJP", fontSize=10.5, leading=16, textColor=INK, leftIndent=20, firstLineIndent=-12, spaceAfter=4, wordWrap="CJK"),
    }


def add_flow(story, styles) -> None:
    story.append(Paragraph("動画作成・共有フロー", styles["h2"]))
    flow = [
        "1. 台本を渡す",
        "2. 画像・構造・日本語タイムラインを確認し、必要な段階で OK を返す",
        "3. MP4 を描画して確認し、最後の OK で共有する",
        "4. Codex が個人ブランチへ push・PR 作成し、オーナー確認を待つ",
        "5. オーナー承認後、Codex が学習案を提示し、承認された内容だけ反映する",
    ]
    data = [[Paragraph(text, styles["body"])] for text in flow]
    table = Table(data, colWidths=[6.15 * inch], hAlign="LEFT")
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), CALL_OUT),
        ("BOX", (0, 0), (0, -1), 0.5, HexColor("#D7DEE8")),
        ("LEFTPADDING", (0, 0), (0, -1), 10),
        ("RIGHTPADDING", (0, 0), (0, -1), 10),
        ("TOPPADDING", (0, 0), (0, -1), 3),
        ("BOTTOMPADDING", (0, 0), (0, -1), 3),
    ]))
    story.append(table)
    story.append(Spacer(1, 8))


def add_table(story, headers: list[str], rows: list[list[str]], styles) -> None:
    if len(headers) == 2:
        widths = [1.8 * inch, 4.35 * inch]
    elif len(headers) == 3:
        widths = [1.38 * inch, 2.38 * inch, 2.39 * inch]
    else:
        widths = [6.15 * inch / len(headers)] * len(headers)
    data = [[Paragraph(inline(value), styles["body"]) for value in headers]]
    for row in rows:
        data.append([Paragraph(inline(value), ParagraphStyle("TableCell", parent=styles["body"], fontSize=9.5, leading=14, spaceAfter=0)) for value in row])
    table = Table(data, colWidths=widths, repeatRows=1, hAlign="LEFT")
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), TABLE_HEADER),
        ("GRID", (0, 0), (-1, -1), 0.45, HexColor("#B7C5D8")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(table)
    story.append(Spacer(1, 8))


def add_callout(story, kind: str, text: str, styles) -> None:
    label = "注意" if kind == "CAUTION" else "重要"
    bg = CAUTION if kind == "CAUTION" else CALL_OUT
    color = HexColor("#7A5A00") if kind == "CAUTION" else DARK_BLUE
    paragraph = Paragraph(f'<b><font color="{color.hexval()}">{label}: </font></b>{inline(text)}', styles["body"])
    table = Table([[paragraph]], colWidths=[6.15 * inch], hAlign="LEFT")
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, 0), bg),
        ("BOX", (0, 0), (0, 0), 0.5, HexColor("#D7DEE8")),
        ("LEFTPADDING", (0, 0), (0, 0), 10),
        ("RIGHTPADDING", (0, 0), (0, 0), 10),
        ("TOPPADDING", (0, 0), (0, 0), 8),
        ("BOTTOMPADDING", (0, 0), (0, 0), 8),
    ]))
    story.append(table)
    story.append(Spacer(1, 8))


def render_markdown(story, source: str, styles) -> None:
    quick_guide = "これだけやればOK" in source
    if quick_guide:
        styles = {
            **styles,
            "body": styles["quick_body"],
            "h1": styles["quick_h1"],
            "h2": styles["quick_h2"],
            "list": styles["quick_list"],
        }
    lines = source.splitlines()
    index = 0
    while index < len(lines):
        line = lines[index]
        if not line.strip():
            index += 1
            continue
        if line.startswith("# "):
            if quick_guide:
                story.append(Spacer(1, 6))
                story.append(Paragraph(inline(line[2:]), styles["quick_title"]))
                story.append(Paragraph("GitHub 参加から動画共有 PR 作成まで", ParagraphStyle("QuickSubtitle", parent=styles["subtitle"], fontSize=10, leading=14, spaceAfter=2)))
                story.append(Paragraph('<link href="https://github.com/kyomu-movie/aka-movie" color="#2E74B5">https://github.com/kyomu-movie/aka-movie</link>', ParagraphStyle("QuickRepo", parent=styles["subtitle"], fontSize=10, leading=14, spaceAfter=8)))
            else:
                story.append(Spacer(1, 36))
                story.append(Paragraph(inline(line[2:]), styles["title"]))
                story.append(Paragraph("GitHub 参加から動画共有 PR 作成まで", styles["subtitle"]))
                story.append(Paragraph('<link href="https://github.com/kyomu-movie/aka-movie" color="#2E74B5">https://github.com/kyomu-movie/aka-movie</link>', ParagraphStyle("Repo", parent=styles["subtitle"], spaceAfter=24)))
            index += 1
            continue
        if line.startswith("## "):
            if line == "## 1. このプロジェクトでできること":
                story.append(PageBreak())
            heading_style = styles["h1_breakable"] if line == "## 8. 困ったとき" else styles["h1"]
            story.append(Paragraph(inline(line[3:]), heading_style))
            index += 1
            continue
        if line.startswith("### "):
            story.append(Paragraph(inline(line[4:]), styles["h2"]))
            index += 1
            continue
        if line.startswith("> [!"):
            kind = re.search(r"\[!(\w+)\]", line).group(1)
            body = lines[index + 1].lstrip("> ").strip() if index + 1 < len(lines) else ""
            add_callout(story, kind, body, styles)
            index += 2
            continue
        if line.startswith("```"):
            language = line[3:].strip()
            block: list[str] = []
            index += 1
            while index < len(lines) and not lines[index].startswith("```"):
                block.append(lines[index])
                index += 1
            index += 1
            if language == "mermaid":
                add_flow(story, styles)
            else:
                story.append(KeepTogether([Preformatted("\n".join(block), styles["code"]), Spacer(1, 4)]))
            continue
        if line == "## 関連資料":
            entries = []
            index += 1
            while index < len(lines) and (not lines[index].strip() or lines[index].startswith("- ")):
                if lines[index].startswith("- "):
                    entries.append(lines[index][2:])
                index += 1
            related = [Paragraph(inline("関連資料"), styles["h1"])]
            related.extend(Paragraph("• " + inline(entry), styles["list"]) for entry in entries)
            story.append(KeepTogether(related))
            continue
        if line.startswith("|") and index + 1 < len(lines) and re.match(r"^\|[\s|:-]+\|$", lines[index + 1]):
            headers = table_row(line)
            rows: list[list[str]] = []
            index += 2
            while index < len(lines) and lines[index].startswith("|"):
                rows.append(table_row(lines[index]))
                index += 1
            add_table(story, headers, rows, styles)
            continue
        if re.match(r"^\d+\. ", line):
            number = 1
            while index < len(lines) and re.match(r"^\d+\. ", lines[index]):
                text = re.sub(r"^\d+\. ", "", lines[index])
                story.append(Paragraph(f"{number}. " + inline(text), styles["list"]))
                number += 1
                index += 1
            continue
        if line.startswith("- [ ] "):
            story.append(Paragraph("□ " + inline(line[6:]), styles["list"]))
            index += 1
            continue
        if line.startswith("- "):
            while index < len(lines) and lines[index].startswith("- ") and not lines[index].startswith("- [ ] "):
                story.append(Paragraph("• " + inline(lines[index][2:]), styles["list"]))
                index += 1
            continue
        story.append(Paragraph(inline(line), styles["body"]))
        index += 1


def draw_header_footer(canvas, doc) -> None:
    canvas.saveState()
    canvas.setFont("NotoSansJP", 8)
    canvas.setFillColor(MUTED)
    canvas.drawRightString(letter[0] - inch, letter[1] - 0.52 * inch, "aka-movie | メンバー向け手順書")
    canvas.drawRightString(letter[0] - inch, 0.48 * inch, f"aka-movie | {doc.page}")
    canvas.restoreState()


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate a member guide PDF from Markdown.")
    parser.add_argument("--source", type=Path, default=SOURCE)
    parser.add_argument("--output", type=Path, default=OUTPUT)
    args = parser.parse_args()
    pdfmetrics.registerFont(TTFont("NotoSansJP", str(FONT)))
    styles = build_styles()
    document = SimpleDocTemplate(
        str(args.output),
        pagesize=letter,
        rightMargin=inch,
        leftMargin=inch,
        topMargin=inch,
        bottomMargin=inch,
        title="aka-movie メンバー向けセットアップ・利用手順書",
        author="aka-movie",
    )
    story = []
    render_markdown(story, args.source.read_text(encoding="utf-8"), styles)
    document.build(story, onFirstPage=draw_header_footer, onLaterPages=draw_header_footer)
    print(f"Created {args.output}")


if __name__ == "__main__":
    main()
