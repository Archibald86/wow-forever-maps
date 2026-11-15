# Relative mob-level heat map

The default cells mode now shows a continuous green–yellow–orange–red scale
relative to the character level. Stops: delta -5 or less (#22c55e), -2 (#a3e635),
0 (#facc15), +2 (#f97316), +5 or more (#ef4444), with interpolated RGB colors.
A gradient legend and labelled stops use the same palette function as rendering.

All known cells have equal opacity (0.58), so density no longer changes the
strength of the level color. Optional numbers retain the estimated density index.
Cells without source records remain unpainted; no values are interpolated into
unknown areas. The grid remains 5% by 5%, the source resolution. The dots mode
uses the same level palette. Selected cells, NPC/resource layers and red cave
circles remain available. Existing mode values and shared/saved links persist.

No source data was changed: 4,953 estimated cells on 40 of 42 maps.
