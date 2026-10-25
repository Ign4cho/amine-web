#!/usr/bin/env bash
# Capturas del pliego en distintos puntos del recorrido: shots-p.sh W H prefijo p1 p2 ...
W=$1; H=$2; PRE=$3; shift 3
for P in "$@"; do
  node scripts/shot.mjs --url http://localhost:4403/ --w $W --h $H --wait ${WAIT:-2500} --out "shots/${PRE}-${P}.png" \
    --eval "(() => { const t = document.querySelector('[data-track]'); scrollTo(0, t.offsetTop + $P * innerHeight * 1.15); return scrollY; })()" | grep -v '^OK'
done
