#!/bin/bash
# Mechanical publish gate for ipqmedia.com/resources.
#
# publish.sh copies the WHOLE of dist/ to the deploy project, so any page sitting in src/pages
# goes live with the next deploy of any unrelated change. That shape has burned us twice
# (2026-07-25, three cycle-written pages published by accident; 2026-09-09, an unscreened page on
# the contractor site). A rule I have to remember at deploy time is not a gate. This is.
#
# Every page slug in dist/ must appear in APPROVED.txt or this exits 1 and publish.sh aborts.
# Usage, from publish.sh, before anything is copied:  bash ~/ipq-resources/scripts/approval-gate.sh
set -euo pipefail
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST="$REPO/dist"
LIST="$REPO/APPROVED.txt"

[ -d "$DIST" ] || { echo "approval-gate: no build at $DIST"; exit 1; }
[ -f "$LIST" ] || { echo "approval-gate: no $LIST"; exit 1; }

approved="$(grep -v '^\s*#' "$LIST" | grep -v '^\s*$' | tr -d ' \t')"
unapproved=""
for d in "$DIST"/*/; do
  slug="$(basename "$d")"
  [ -f "$d/index.html" ] || continue
  case "$slug" in seo|creatives) continue ;; esac
  if ! printf '%s\n' "$approved" | grep -qx "$slug"; then
    unapproved="$unapproved $slug"
  fi
done

if [ -n "$unapproved" ]; then
  echo "APPROVAL GATE: these pages are built but NOT in APPROVED.txt:"
  for s in $unapproved; do echo "   - $s"; done
  echo "Get Arseniy's yes, add the slug to APPROVED.txt, then deploy. Aborting."
  exit 1
fi
echo "approval gate clean ($(printf '%s\n' "$approved" | wc -l | tr -d ' ') slugs approved)"
