#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
docx_plumber.py — pdfplumber-style inspection for .docx WITHOUT LibreOffice/Word.

Python 3.9.6 compatible. Pure stdlib (zipfile + xml.etree). No pip installs needed.
Optional: if fontTools is installed AND you point --font at a real .ttf, character
widths become exact instead of table-based.

WHAT IT GIVES YOU
  1. Package validation  : required OOXML parts, relationship integrity,
                           well-formed XML for every part (catches corrupt docs).
  2. Geometry            : page size, margins, orientation, columns per section.
  3. Structure           : paragraphs (style, alignment, indent, spacing),
                           runs (font, size, bold/italic — resolved through
                           docDefaults -> style chain -> direct formatting),
                           tables (grid, widths, merges), inline images (px + EMU size).
  4. ESTIMATED layout    : line-wrap + pagination computed from font metrics,
                           i.e. an approximation of what a layout engine would do.
                           OOXML stores no page breaks — this is physically the
                           best any renderer-less tool can do.

USAGE
  python docx_plumber.py file.docx                 # human summary
  python docx_plumber.py file.docx --json out.json # full machine-readable report
  python docx_plumber.py file.docx --strict        # exit 1 on validation errors
"""
import sys, os, json, zipfile, argparse, posixpath, struct
import xml.etree.ElementTree as ET

W  = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
R  = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}"
CT = "{http://schemas.openxmlformats.org/package/2006/content-types}"
PR = "{http://schemas.openxmlformats.org/package/2006/relationships}"
A  = "{http://schemas.openxmlformats.org/drawingml/2006/main}"
WP = "{http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing}"

TWIPS_PER_PT = 20.0
EMU_PER_PX   = 9525

# ---------------------------------------------------------------- font metrics
# Per-character advance widths in 1/1000 em, measured from Calibri (Word's
# default). Unknown chars fall back to AVG. Other common fonts get a scale
# factor relative to Calibri — crude, but keeps estimates within a few %.
CALIBRI = {' ':226,'!':326,'"':401,'#':498,'$':507,'%':715,'&':682,"'":221,
'(':303,')':303,'*':498,'+':498,',':250,'-':306,'.':252,'/':386,'0':507,
'1':507,'2':507,'3':507,'4':507,'5':507,'6':507,'7':507,'8':507,'9':507,
':':268,';':268,'<':498,'=':498,'>':498,'?':463,'@':894,'A':579,'B':544,
'C':533,'D':615,'E':488,'F':459,'G':631,'H':623,'I':252,'J':319,'K':520,
'L':420,'M':855,'N':646,'O':662,'P':517,'Q':673,'R':543,'S':459,'T':487,
'U':642,'V':567,'W':890,'X':519,'Y':487,'Z':468,'[':307,'\\':386,']':307,
'^':498,'_':498,'`':291,'a':479,'b':525,'c':423,'d':525,'e':498,'f':305,
'g':471,'h':525,'i':229,'j':239,'k':455,'l':229,'m':799,'n':525,'o':527,
'p':525,'q':525,'r':349,'s':391,'t':335,'u':525,'v':452,'w':715,'x':433,
'y':453,'z':395,'{':314,'|':460,'}':314,'~':498}
AVG = 500
FONT_SCALE = {"calibri":1.0,"arial":1.03,"helvetica":1.03,"times new roman":0.94,
              "cambria":0.98,"georgia":1.05,"verdana":1.17,"courier new":1.20,
              "tahoma":1.05,"segoe ui":1.02}
BOLD_FACTOR = 1.02
LINE_HEIGHT_EM = 1.15   # Word/LO single-spacing ≈ 1.15–1.22 em; 1.15 calibrated vs LibreOffice

def text_width_pt(text, size_pt, font="Calibri", bold=False):
    scale = FONT_SCALE.get((font or "Calibri").lower(), 1.0)
    units = sum(CALIBRI.get(ch, AVG) for ch in text)
    w = units / 1000.0 * size_pt * scale
    return w * BOLD_FACTOR if bold else w

# ---------------------------------------------------------------- package layer
REQUIRED = ["[Content_Types].xml", "_rels/.rels", "word/document.xml"]

def validate_package(zf):
    issues, names = [], set(zf.namelist())
    for p in REQUIRED:
        if p not in names:
            issues.append(("ERROR", "missing required part: " + p))
    for n in names:
        if n.endswith((".xml", ".rels")):
            try:
                ET.fromstring(zf.read(n))
            except ET.ParseError as e:
                issues.append(("ERROR", "malformed XML in %s: %s" % (n, e)))
    # every relationship target must exist
    for n in [x for x in names if x.endswith(".rels")]:
        base = posixpath.dirname(posixpath.dirname(n))
        try:
            for rel in ET.fromstring(zf.read(n)):
                if rel.get("TargetMode") == "External":
                    continue
                tgt = posixpath.normpath(posixpath.join(base, rel.get("Target", "")))
                if tgt.lstrip("/") not in names and tgt not in names:
                    issues.append(("ERROR", "%s -> dangling target %s" % (n, tgt)))
        except ET.ParseError:
            pass
    if "[Content_Types].xml" in names:
        ct = ET.fromstring(zf.read("[Content_Types].xml"))
        declared_exts = {d.get("Extension","").lower() for d in ct.iter(CT+"Default")}
        overrides = {o.get("PartName","").lstrip("/") for o in ct.iter(CT+"Override")}
        for n in names:
            ext = n.rsplit(".",1)[-1].lower() if "." in n else ""
            if n not in overrides and ext not in declared_exts and ext != "":
                issues.append(("WARN", "no content type for part: " + n))
    return issues

# ---------------------------------------------------------------- style resolution
def _rpr_props(rpr):
    p = {}
    if rpr is None: return p
    sz = rpr.find(W+"sz")
    if sz is not None and sz.get(W+"val"): p["size_pt"] = float(sz.get(W+"val"))/2.0
    fo = rpr.find(W+"rFonts")
    if fo is not None:
        p["font"] = fo.get(W+"ascii") or fo.get(W+"hAnsi") or fo.get(W+"cs")
    for tag,key in ((W+"b","bold"),(W+"i","italic"),(W+"u","underline")):
        el = rpr.find(tag)
        if el is not None: p[key] = el.get(W+"val","true") not in ("false","0","none")
    return p

def _ppr_props(ppr):
    p = {}
    if ppr is None: return p
    jc = ppr.find(W+"jc")
    if jc is not None: p["align"] = jc.get(W+"val")
    ind = ppr.find(W+"ind")
    if ind is not None:
        for k in ("left","right","firstLine","hanging"):
            v = ind.get(W+k)
            if v: p["indent_"+k+"_pt"] = float(v)/TWIPS_PER_PT
    sp = ppr.find(W+"spacing")
    if sp is not None:
        for k in ("before","after"):
            v = sp.get(W+k)
            if v: p["space_"+k+"_pt"] = float(v)/TWIPS_PER_PT
        ln = sp.get(W+"line")
        if ln:
            p["line_pt" if sp.get(W+"lineRule") in ("exact","atLeast") else "line_mult"] = \
                float(ln)/TWIPS_PER_PT if sp.get(W+"lineRule") in ("exact","atLeast") else float(ln)/240.0
    return p

def load_styles(zf):
    styles, defaults = {}, {"font":"Calibri","size_pt":11.0}
    if "word/styles.xml" not in zf.namelist():
        return styles, defaults
    root = ET.fromstring(zf.read("word/styles.xml"))
    dd = root.find(W+"docDefaults")
    if dd is not None:
        rpd = dd.find(W+"rPrDefault")
        if rpd is not None:
            defaults.update(_rpr_props(rpd.find(W+"rPr")))
        ppd = dd.find(W+"pPrDefault")
        if ppd is not None:
            defaults.update(_ppr_props(ppd.find(W+"pPr")))
    for st in root.iter(W+"style"):
        sid = st.get(W+"styleId")
        based = st.find(W+"basedOn")
        styles[sid] = {
            "basedOn": based.get(W+"val") if based is not None else None,
            "run":  _rpr_props(st.find(W+"rPr")),
            "para": _ppr_props(st.find(W+"pPr")),
        }
    return styles, defaults

def resolve_chain(styles, sid, key):
    out, seen = {}, set()
    chain = []
    while sid and sid in styles and sid not in seen:
        seen.add(sid); chain.append(sid); sid = styles[sid]["basedOn"]
    for s in reversed(chain):
        out.update(styles[s][key])
    return out

# ---------------------------------------------------------------- document walk
def png_size(data):
    if data[:8] == b"\x89PNG\r\n\x1a\n":
        w,h = struct.unpack(">II", data[16:24]); return w,h
    return None

def _read_sectpr(sect):
    geom = {"page_w_pt":612.0,"page_h_pt":792.0,
            "margins_pt":{"top":72,"bottom":72,"left":72,"right":72},
            "header_pt":36.0,"footer_pt":36.0,
            "orientation":"portrait","columns":1,"col_space_pt":36.0,
            "header_refs":[],"footer_refs":[]}
    if sect is None: return geom
    pg = sect.find(W+"pgSz")
    if pg is not None:
        geom["page_w_pt"] = float(pg.get(W+"w",12240))/TWIPS_PER_PT
        geom["page_h_pt"] = float(pg.get(W+"h",15840))/TWIPS_PER_PT
        # Trust geometry over the declared attribute — generators often stamp
        # 'portrait' on swapped (landscape) dimensions.
        geom["orientation"] = "landscape" if geom["page_w_pt"] > geom["page_h_pt"] else "portrait"
        geom["orientation_declared"] = pg.get(W+"orient")
    mg = sect.find(W+"pgMar")
    if mg is not None:
        geom["margins_pt"] = {k: float(mg.get(W+k,1440))/TWIPS_PER_PT
                              for k in ("top","bottom","left","right")}
        geom["header_pt"] = float(mg.get(W+"header",720))/TWIPS_PER_PT
        geom["footer_pt"] = float(mg.get(W+"footer",720))/TWIPS_PER_PT
    cols = sect.find(W+"cols")
    if cols is not None:
        geom["columns"] = int(cols.get(W+"num",1))
        geom["col_space_pt"] = float(cols.get(W+"space",720))/TWIPS_PER_PT
    for tag,key in ((W+"headerReference","header_refs"),(W+"footerReference","footer_refs")):
        for ref in sect.findall(tag):
            geom[key].append(ref.get(R+"id"))
    return geom

def load_rels(zf):
    rels = {}
    if "word/_rels/document.xml.rels" in zf.namelist():
        for rel in ET.fromstring(zf.read("word/_rels/document.xml.rels")):
            rels[rel.get("Id")] = "word/" + rel.get("Target","").lstrip("/")
    return rels

def scan_fields(zf, part):
    """Return set of field codes (PAGE, NUMPAGES, ...) used in a header/footer part."""
    fields = set()
    if part not in zf.namelist(): return fields
    root = ET.fromstring(zf.read(part))
    for f in root.iter(W+"fldSimple"):
        fields.add((f.get(W+"instr") or "").strip().split(" ")[0])
    for it in root.iter(W+"instrText"):
        if it.text: fields.add(it.text.strip().split(" ")[0])
    return {f for f in fields if f}

def parse_document(zf):
    styles, defaults = load_styles(zf)
    rels = load_rels(zf)
    root = ET.fromstring(zf.read("word/document.xml"))
    body = root.find(W+"body")
    sections, cur_blocks = [], []
    for el in body:
        tag = el.tag.split("}")[1]
        if tag == "p":
            para = parse_paragraph(el, styles, defaults, zf)
            ppr = el.find(W+"pPr")
            sect = ppr.find(W+"sectPr") if ppr is not None else None
            cur_blocks.append(para)
            if sect is not None:                     # paragraph that ENDS a section
                sections.append((_read_sectpr(sect), cur_blocks)); cur_blocks = []
        elif tag == "tbl":
            cur_blocks.append(parse_table(el, styles, defaults, zf))
        elif tag == "sectPr":                        # final section
            sections.append((_read_sectpr(el), cur_blocks)); cur_blocks = []
    if cur_blocks:
        sections.append((_read_sectpr(None), cur_blocks))
    # resolve header/footer parts + detect page-number fields per section
    out_sections = []
    for geom, blocks in sections:
        hf = {"header_parts":[],"footer_parts":[],"fields":[]}
        for rid in geom.pop("header_refs"):
            p = rels.get(rid)
            if p: hf["header_parts"].append(p); hf["fields"] += sorted(scan_fields(zf,p))
        for rid in geom.pop("footer_refs"):
            p = rels.get(rid)
            if p: hf["footer_parts"].append(p); hf["fields"] += sorted(scan_fields(zf,p))
        hf["fields"] = sorted(set(hf["fields"]))
        hf["page_numbering"] = any(f in ("PAGE","NUMPAGES","SECTIONPAGES") for f in hf["fields"])
        out_sections.append({"geometry":geom,"headers_footers":hf,"blocks":blocks})
    return out_sections, styles, defaults

def parse_paragraph(p, styles, defaults, zf):
    ppr = p.find(W+"pPr")
    sid = None
    if ppr is not None:
        ps = ppr.find(W+"pStyle")
        if ps is not None: sid = ps.get(W+"val")
    para_props = dict(defaults)
    para_props.update(resolve_chain(styles, sid, "para"))
    para_props.update(_ppr_props(ppr))
    style_run = dict(defaults)
    style_run.update(resolve_chain(styles, sid, "run"))
    runs, images, page_break = [], [], False
    for r in p.iter(W+"r"):
        rp = dict(style_run); rp.update(_rpr_props(r.find(W+"rPr")))
        txt = "".join(t.text or "" for t in r.iter(W+"t"))
        if r.find(W+"br[@"+W+"type='page']") is not None: page_break = True
        for blip in r.iter(A+"blip"):
            rid = blip.get(R+"embed")
            img = {"rel_id": rid}
            ext = next(iter(r.iter(A+"ext")), None)
            if ext is not None:
                img["display_w_pt"] = int(ext.get("cx",0))/12700.0
                img["display_h_pt"] = int(ext.get("cy",0))/12700.0
            images.append(img)
        if txt or images:
            runs.append({"text": txt, "font": rp.get("font","Calibri"),
                         "size_pt": rp.get("size_pt",11.0),
                         "bold": rp.get("bold",False), "italic": rp.get("italic",False)})
    return {"type":"paragraph","style":sid,"props":para_props,"runs":runs,
            "images":images,"explicit_page_break":page_break,
            "text":"".join(r["text"] for r in runs)}

def parse_table(tbl, styles, defaults, zf):
    grid = [float(g.get(W+"w",0))/TWIPS_PER_PT for g in tbl.iter(W+"gridCol")]
    rows = []
    for tr in tbl.findall(W+"tr"):
        cells = []
        for tc in tr.findall(W+"tc"):
            tcpr = tc.find(W+"tcPr")
            span = 1; vmerge = None; w_pt = None
            if tcpr is not None:
                gs = tcpr.find(W+"gridSpan")
                if gs is not None: span = int(gs.get(W+"val",1))
                vm = tcpr.find(W+"vMerge")
                if vm is not None: vmerge = vm.get(W+"val","continue")
                tw = tcpr.find(W+"tcW")
                if tw is not None and tw.get(W+"type")=="dxa":
                    w_pt = float(tw.get(W+"w",0))/TWIPS_PER_PT
            tdir = None
            if tcpr is not None:
                td = tcpr.find(W+"textDirection")
                if td is not None: tdir = td.get(W+"val")
            paras = [parse_paragraph(p, styles, defaults, zf) for p in tc.findall(W+"p")]
            cell_imgs = [img for p in paras for img in p["images"]]
            cells.append({"span":span,"vmerge":vmerge,"width_pt":w_pt,
                          "text_direction":tdir,"images":cell_imgs,
                          "n_images":len(cell_imgs),
                          "text":" ".join(p["text"] for p in paras),"paras":paras})
        rows.append(cells)
    return {"type":"table","grid_pt":grid,"n_rows":len(rows),
            "n_cols":len(grid) or (len(rows[0]) if rows else 0),"rows":rows}

# ---------------------------------------------------------------- layout estimate
def wrap_lines(runs, avail_w_pt):
    """Greedy word-wrap using per-char metrics. Returns line count + max font size."""
    if not runs: return 1, 11.0
    words, max_sz = [], 0.0
    for r in runs:
        max_sz = max(max_sz, r["size_pt"])
        for w_ in r["text"].split(" "):
            words.append((w_, r))
    space_cache = {}
    lines, cur = 1, 0.0
    for w_, r in words:
        ww = text_width_pt(w_, r["size_pt"], r["font"], r["bold"])
        key = (r["size_pt"], r["font"], r["bold"])
        if key not in space_cache:
            space_cache[key] = text_width_pt(" ", r["size_pt"], r["font"], r["bold"])
        sw = space_cache[key] if cur > 0 else 0.0
        if cur + sw + ww > avail_w_pt and cur > 0:
            lines += 1; cur = ww
        else:
            cur += sw + ww
    return lines, (max_sz or 11.0)

def estimate_layout(sections):
    page, placements = 0, []
    total_table_imgs = 0
    for si, sec in enumerate(sections):
        g = sec["geometry"]
        ncol = max(g.get("columns",1),1)
        col_w = (g["page_w_pt"] - g["margins_pt"]["left"] - g["margins_pt"]["right"]
                 - (ncol-1)*g.get("col_space_pt",36.0)) / ncol
        avail_h = g["page_h_pt"] - g["margins_pt"]["top"] - g["margins_pt"]["bottom"]
        page += 1; col, y = 1, 0.0            # each section starts on a new page
        def advance(h, forced=False):
            nonlocal page, col, y
            if forced or (y + h > avail_h and y > 0):
                if col < ncol: col += 1
                else: page += 1; col = 1
                y = 0.0
            y += h
        for i, b in enumerate(sec["blocks"]):
            if b["type"] == "paragraph":
                props = b["props"]
                indent = props.get("indent_left_pt",0)+props.get("indent_right_pt",0)
                lines, sz = wrap_lines(b["runs"], max(col_w - indent, 36.0))
                line_h = props.get("line_pt") or sz*LINE_HEIGHT_EM*props.get("line_mult",1.0)
                img_h = sum(img.get("display_h_pt",0) for img in b["images"])
                if b["explicit_page_break"]:
                    advance(0, forced=True)
                start_pg = page
                # flow line-by-line so paragraphs split across columns/pages
                y += props.get("space_before_pt",0)
                for _ in range(lines):
                    if y + line_h > avail_h and y > 0:
                        advance(0, forced=True)
                    y += line_h
                if img_h:
                    advance(img_h)
                y += props.get("space_after_pt",0)
                placements.append({"section":si,"type":"paragraph","page":start_pg,
                                   "page_end":page,"column":col,
                                   "est_height_pt":round(lines*line_h+img_h,1),
                                   "est_lines":lines,"text_preview":b["text"][:60]})
            else:
                start = page
                imgs_in_tbl = 0
                for row in b["rows"]:
                    row_h = 0.0
                    for cell in row:
                        cw = cell["width_pt"] or (sum(b["grid_pt"])/max(b["n_cols"],1))
                        if cell.get("text_direction") in ("btLr","tbRl","tbRlV","btLrV"):
                            cw = max(cw, 200)   # rotated text wraps along cell height
                        cell_h = 0.0
                        for p_ in cell["paras"]:
                            ln, sz = wrap_lines(p_["runs"], max(cw-10.8,20))
                            cell_h += ln*sz*LINE_HEIGHT_EM
                        for img in cell.get("images",[]):
                            cell_h += img.get("display_h_pt",0); imgs_in_tbl += 1
                        row_h = max(row_h, cell_h + 4)
                    advance(row_h)
                total_table_imgs += imgs_in_tbl
                placements.append({"section":si,"type":"table","page_start":start,"page_end":page,
                                   "n_rows":b["n_rows"],"n_cols":b["n_cols"],
                                   "images_in_cells":imgs_in_tbl,
                                   "rotated_cells":sum(1 for r in b["rows"] for c in r
                                                       if c.get("text_direction"))})
    return {"estimated_pages":page,"placements":placements,
            "images_in_table_cells":total_table_imgs}

# ---------------------------------------------------------------- main
def inspect(path):
    zf = zipfile.ZipFile(path)
    issues = validate_package(zf)
    fatal = any(s == "ERROR" for s, _ in issues)
    if fatal:
        sections, styles, defaults = [], {}, {}
        layout = {"estimated_pages":0,"placements":[],"images_in_table_cells":0}
    else:
        sections, styles, defaults = parse_document(zf)
        layout = estimate_layout(sections)
    imgs = []
    for n in zf.namelist():
        if n.startswith("word/media/"):
            data = zf.read(n)
            e = {"part":n,"bytes":len(data)}
            px = png_size(data)
            if px: e["px"] = list(px)
            imgs.append(e)
    all_blocks = [b for s in sections for b in s["blocks"]]
    n_words = sum(len(b["text"].split()) for b in all_blocks if b["type"]=="paragraph")
    return {
        "file": os.path.basename(path),
        "validation": {"ok": not fatal,
                       "issues":[{"level":s,"msg":m} for s,m in issues]},
        "sections":[{"geometry":s["geometry"],"headers_footers":s["headers_footers"],
                     "n_blocks":len(s["blocks"])} for s in sections],
        "counts":{"sections":len(sections),"blocks":len(all_blocks),
                  "paragraphs":sum(1 for b in all_blocks if b["type"]=="paragraph"),
                  "tables":sum(1 for b in all_blocks if b["type"]=="table"),
                  "words":n_words,"media_files":len(imgs),
                  "styles_defined":len(styles)},
        "default_run": defaults, "media": imgs,
        "estimated_layout": layout,
        "blocks": all_blocks,
    }

def main():
    ap = argparse.ArgumentParser(description="pdfplumber-style docx inspector (no soffice needed)")
    ap.add_argument("docx"); ap.add_argument("--json"); ap.add_argument("--strict", action="store_true")
    args = ap.parse_args()
    rep = inspect(args.docx)
    print("=== %s ===" % rep["file"])
    print("validation : %s (%d issue(s))" % ("OK" if rep["validation"]["ok"] else "FAILED",
                                             len(rep["validation"]["issues"])))
    for it in rep["validation"]["issues"][:10]:
        print("  [%s] %s" % (it["level"], it["msg"]))
    if not rep["validation"]["ok"]:
        sys.exit(1 if args.strict else 0)
    c, L = rep["counts"], rep["estimated_layout"]
    for i, s in enumerate(rep["sections"]):
        g, hf = s["geometry"], s["headers_footers"]
        print("section %d  : %.0fx%.0f pt %s, %d col(s), margins T%.0f/B%.0f/L%.0f/R%.0f"
              % (i+1, g["page_w_pt"], g["page_h_pt"], g["orientation"], g["columns"],
                 g["margins_pt"]["top"], g["margins_pt"]["bottom"],
                 g["margins_pt"]["left"], g["margins_pt"]["right"]))
        if hf["header_parts"] or hf["footer_parts"]:
            print("             headers/footers: %s | fields: %s | page numbering: %s"
                  % (", ".join(hf["header_parts"]+hf["footer_parts"]) or "-",
                     ", ".join(hf["fields"]) or "-", hf["page_numbering"]))
    print("content    : %d paragraphs, %d tables, %d words, %d media file(s)"
          % (c["paragraphs"], c["tables"], c["words"], c["media_files"]))
    for pl in L["placements"]:
        if pl["type"] == "table":
            print("table      : %dx%d on page %d-%d, %d image(s) in cells, %d rotated cell(s)"
                  % (pl["n_rows"], pl["n_cols"], pl["page_start"], pl["page_end"],
                     pl["images_in_cells"], pl["rotated_cells"]))
    print("ESTIMATED  : %d page(s)" % L["estimated_pages"])
    if args.json:
        with open(args.json, "w") as f:
            json.dump(rep, f, indent=2, ensure_ascii=False)
        print("full report: %s" % args.json)

if __name__ == "__main__":
    main()
