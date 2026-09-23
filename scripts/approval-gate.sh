#!/bin/bash
# Mechanical publish gate for ipqmedia.com/resources.
#
# THE GATE'S JOB: a page Arseniy has not approved must never be live. That is the only property
# that matters, and it is non-negotiable.
#
# THE 2026-09-23 REWRITE: the first version enforced that property by ABORTING the whole deploy
# when any unapproved page was present in dist/. That made approval all-or-nothing, and it cost
# us seven days. `marketing-plan-for-architects` was written on 09-16 and sat unapproved, so from
# 09-16 to 09-23 NOTHING on /resources deployed: the cross-brand crawl fix (5a03cb9), the Clutch
# work and the stats feed all sat committed and dark, and a roadmap task gated on that crawl fix
# going live could not move either. A gate that blocks approved work to hold back unapproved work
# is enforcing the wrong thing.
#
# So the gate now EXCLUDES instead of aborting. Unapproved pages are stripped out of the deploy
# payload along with every reference to them, and the run ends with a hard assertion that not one
# byte of the slug survives anywhere in the payload. That is STRICTLY stronger than the abort:
#   - unapproved pages still cannot go live (same property, now proven per deploy, not assumed)
#   - a page that was live and is later removed from APPROVED.txt now gets pulled DOWN on the
#     next deploy, which the abort version never did
#   - approved work ships on its own schedule
# If the strip cannot be done cleanly, the assertion fails and the deploy aborts. Fail closed.
#
# Usage:
#   bash scripts/approval-gate.sh --check [dir]    report only; exit 1 if anything is unapproved
#   bash scripts/approval-gate.sh --prune <dir>    strip unapproved pages + refs, assert clean
# publish.sh calls --prune on the STAGED COPY, never on dist/, so the build stays intact.
set -euo pipefail
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LIST="$REPO/APPROVED.txt"
MODE="${1:---check}"
TARGET="${2:-$REPO/dist}"

[ -f "$LIST" ] || { echo "approval-gate: no $LIST"; exit 1; }
[ -d "$TARGET" ] || { echo "approval-gate: no directory at $TARGET"; exit 1; }

case "$MODE" in
  --check|--prune) ;;
  *) echo "approval-gate: unknown mode '$MODE' (use --check or --prune)"; exit 1 ;;
esac

APPROVED_LIST="$LIST" TARGET_DIR="$TARGET" GATE_MODE="$MODE" python3 - << 'PY'
import os, re, sys, shutil

target   = os.environ['TARGET_DIR']
mode     = os.environ['GATE_MODE']
# Directories that are assets, not pages, and carry no approval status of their own.
NOT_PAGES = {'seo', 'creatives'}

approved = set()
for line in open(os.environ['APPROVED_LIST'], encoding='utf-8'):
    line = line.split('#', 1)[0].strip()
    if line:
        approved.add(line)

unapproved = sorted(
    slug for slug in os.listdir(target)
    if slug not in NOT_PAGES
    and os.path.isfile(os.path.join(target, slug, 'index.html'))
    and slug not in approved
)

if not unapproved:
    print(f'approval gate clean ({len(approved)} slugs approved, 0 to strip)')
    sys.exit(0)

if mode == '--check':
    print('APPROVAL GATE: built but NOT in APPROVED.txt:')
    for s in unapproved:
        print(f'   - {s}')
    print("Get Arseniy's yes and add the slug to APPROVED.txt, or run --prune to deploy without it.")
    sys.exit(1)

# --- prune ---------------------------------------------------------------------------------
# Slugs are matched on a boundary, never as a bare substring: `architecture-marketing` must not
# match `architecture-marketing-statistics-and-costs-2026`. A URL path segment ends at one of
# / " ' < > # ? ) or end-of-string.
def slug_re(slug):
    return re.compile(r'/' + re.escape(slug) + r'(?=[/"\'<>#?)\s]|$)')

TEXTY = ('.html', '.xml', '.txt', '.json')

for slug in unapproved:
    shutil.rmtree(os.path.join(target, slug))
print('stripped page directories: ' + ', '.join(unapproved))

edits = 0
for root, _, files in os.walk(target):
    for fn in files:
        if not fn.endswith(TEXTY):
            continue
        path = os.path.join(root, fn)
        original = open(path, encoding='utf-8').read()
        s = original
        for slug in unapproved:
            pat = slug_re(slug)

            # 1. sitemap: drop the whole <url> block that points at it
            s = re.sub(r'<url>(?:(?!</url>).)*?' + re.escape(slug) + r'(?:(?!</url>).)*?</url>',
                       '', s, flags=re.S)

            # 2. llms.txt and any other line-oriented text: drop the line
            if fn.endswith(('.txt', '.md')):
                s = '\n'.join(l for l in s.split('\n') if not pat.search(l))

            # 3. HTML anchors. An anchor wrapping block content is a card or a nav tile and the
            #    whole element goes; an inline anchor is prose and only the <a> wrapper goes, so
            #    the sentence still reads. Unwrapping a card would leave a floating heading.
            def kill_anchor(m):
                inner = m.group(1)
                if re.search(r'<(?:h[1-6]|p|div|section|article|li)\b', inner, re.I):
                    return ''
                return inner
            s = re.sub(r'<a\b[^>]*?href="[^"]*?' + re.escape(slug) + r'[^"]*?"[^>]*>(.*?)</a>',
                       kill_anchor, s, flags=re.S | re.I)

        if s != original:
            open(path, 'w', encoding='utf-8').write(s)
            edits += 1
print(f'rewrote {edits} file(s) to drop references')

# --- the assertion that makes this a gate --------------------------------------------------
# Not one byte of an unapproved slug may survive in the payload, in any file type, anywhere.
residue = []
for root, _, files in os.walk(target):
    for fn in files:
        path = os.path.join(root, fn)
        try:
            s = open(path, encoding='utf-8').read()
        except (UnicodeDecodeError, IsADirectoryError):
            continue
        for slug in unapproved:
            n = s.count(slug)
            if n:
                residue.append(f'{os.path.relpath(path, target)}: {slug} x{n}')

if residue:
    print('APPROVAL GATE FAILED: unapproved slugs survived the strip -')
    for r in residue:
        print(f'   {r}')
    print('Aborting rather than shipping a broken reference.')
    sys.exit(1)

print(f'approval gate clean ({len(approved)} approved, {len(unapproved)} stripped, 0 residue)')
PY
