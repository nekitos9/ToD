# Local Design Reference

This directory is the local source for Figma visual details. It contains unchanged raw exports plus generated, screen-sized indexes.

## Working order

1. Read [DESIGN_INDEX.md](DESIGN_INDEX.md) and [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md).
2. Open only the JSON, screenshot and indexed vector assets for the screen being implemented.
3. Read a full `raw/design/nodes.json` or `raw/prompt.md` only when the compact index and frame files are insufficient.
4. Do not use Figma MCP without explicit user permission.

## Layout

- `mobile/raw/` and `desktop/raw/`: byte-for-byte contents of the two `.figmacapture.zip` exports.
- `mobile/frames/` and `desktop/frames/`: one JSON tree per top-level application frame/state.
- `mobile/screenshots/` and `desktop/screenshots/`: unscaled crops from the original reference renders.
- `assets/ASSET_INDEX.md`: quick links to original composite assets and indexed vectors.
- `assets/vector-assets.json`: deduplicated exact vector paths, fills and their frame/node usages.

Technical `EXPORT_*` containers are not application screens. If future captures include them, the generator indexes their child frames instead of the container itself.

Regenerate derived files after replacing a raw export:

```bash
node scripts/build-design-reference.ts
```
