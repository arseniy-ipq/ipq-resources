#!/bin/bash
# Publish the resources content site to ipqmedia.com/resources/ (Vercel project ipq-resources-content).
# REPLACES the old gh-pages + Pages-build flow (dead since the 2026-07-17 migration — the
# resources.ipqmedia.com subdomain now 301s to ipqmedia.com/resources/).
#
# Usage (Pheme, AFTER Arseniy approves the content):
#   cd ~/ipq-resources && npm run build     # same build as always, source unchanged
#   bash ~/ipq-resources-deploy/publish.sh  # post-process + deploy (thin shim onto this file)
#
# What it does: stages dist/ under ~/ipq-resources-deploy/resources, strips any page Arseniy has
# not approved, rewrites subdomain-absolute URLs to https://ipqmedia.com/resources and
# root-relative href/src to /resources/..., then deploys. The apex proxies /resources/* here.
#
# 2026-09-23: this file moved into the git repo. It used to live only at
# ~/ipq-resources-deploy/publish.sh, which is not a git repository, so the script that decides
# what goes live was the one thing nobody could review or roll back. The gate and its allowlist
# were put in the repo for exactly that reason; the script enforcing them belongs there too.
set -euo pipefail
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$REPO/dist"
DEPLOY=~/ipq-resources-deploy
STAGE="$DEPLOY/resources"

[ -f "$SRC/index.html" ] || { echo "no build at $SRC — run npm run build in $REPO first"; exit 1; }

rm -rf "$STAGE"
mkdir -p "$STAGE"
cp -R "$SRC"/. "$STAGE/"
rm -f "$STAGE/CNAME" "$STAGE/.nojekyll"

# Mechanical approval gate. Runs on the STAGED COPY so dist/ is never mutated: any page not in
# APPROVED.txt is stripped out of the payload along with every link, sitemap entry and llms.txt
# line pointing at it, and the gate then asserts zero residue or aborts. See scripts/approval-gate.sh
# for why this excludes rather than aborting (the 09-16 to 09-23 freeze).
bash "$REPO/scripts/approval-gate.sh" --prune "$STAGE"

python3 - << 'EOF'
import os, re, sys
os.chdir(os.path.expanduser('~/ipq-resources-deploy/resources'))
for root, _, files in os.walk('.'):
    for fn in files:
        if not fn.endswith(('.html', '.xml', '.txt', '.json')):
            continue
        p = os.path.join(root, fn)
        s = open(p, encoding='utf-8').read()
        s = s.replace('https://resources.ipqmedia.com', 'https://ipqmedia.com/resources')
        # hub root: emit the NON-SLASH form. The apex's trailing-slash rewrite lives in the
        # redesign repo and has been wiped by 3 of 3 of its deploys; the non-slash form only
        # needs the base rule, which always ships. Keeps sitemap == rel=canonical.
        s = s.replace('<loc>https://ipqmedia.com/resources/</loc>', '<loc>https://ipqmedia.com/resources</loc>')
        s = re.sub(r'(href|src|action)="/(?!resources/)', r'\1="/resources/', s)
        open(p, 'w', encoding='utf-8').write(s)
# gate: zero residue or abort the deploy
bad = 0
for root, _, files in os.walk('.'):
    for fn in files:
        if not fn.endswith(('.html', '.xml', '.txt', '.json')): continue
        s = open(os.path.join(root, fn), encoding='utf-8').read()
        bad += len(re.findall(r'(?:href|src|action)="/(?!resources/)', s)) + s.count('resources.ipqmedia.com')
if bad:
    print(f'RESIDUE: {bad} unrewritten refs — aborting'); sys.exit(1)
print('rewrite clean')
EOF

cd "$DEPLOY" && vercel deploy --prod --yes
echo "verify: curl -s https://ipqmedia.com/resources/ | grep -c 'Architecture marketing'"
