import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'

type NodeRecord = {
  id: string
  name: string
  type: string
  text?: string
  layout?: { width?: number; height?: number; x?: number; y?: number }
  style?: Record<string, unknown>
  children?: NodeRecord[]
  vectorPaths?: unknown
  fillGeometry?: unknown
}

type ExportConfig = {
  key: 'mobile' | 'desktop'
  label: string
  rawDir: string
}

const rootDir = join(process.cwd(), 'design-reference')
const exports: ExportConfig[] = [
  { key: 'mobile', label: 'Mobile', rawDir: join(rootDir, 'mobile/raw') },
  { key: 'desktop', label: 'Desktop / Tablet / TV', rawDir: join(rootDir, 'desktop/raw') },
]

const indexRows: string[] = []
const allNodes: NodeRecord[] = []
const vectorAssets = new Map<string, { asset: object; usages: Array<{ export: string; frame: string; nodeId: string }> }>()

for (const config of exports) {
  const manifest = JSON.parse(readFileSync(join(config.rawDir, 'manifest.json'), 'utf8'))
  const tree = JSON.parse(readFileSync(join(config.rawDir, 'design/nodes.json'), 'utf8')) as NodeRecord
  const frames = collectScreenFrames(tree.children ?? [])
  const referenceRelative = manifest.root.primaryReferencePath as string
  const referencePath = join(config.rawDir, referenceRelative)
  const paddingX = (manifest.root.targetViewport.width - Number(tree.layout?.width)) / 2
  const paddingY = (manifest.root.targetViewport.height - Number(tree.layout?.height)) / 2

  for (const frame of frames) {
    const slug = `${slugify(frame.name)}--${frame.id.replace(':', '-')}`
    const framePath = join(rootDir, config.key, 'frames', `${slug}.json`)
    const screenshotPath = join(rootDir, config.key, 'screenshots', `${slug}.png`)
    writeJson(framePath, frame)

    const x = Math.round(Number(frame.layout?.x) + paddingX)
    const y = Math.round(Number(frame.layout?.y) + paddingY)
    const width = Math.round(Number(frame.layout?.width))
    const height = Math.round(Number(frame.layout?.height))
    mkdirSync(dirname(screenshotPath), { recursive: true })
    if (!existsSync(screenshotPath)) {
      execFileSync('ffmpeg', [
        '-loglevel', 'error', '-y', '-i', referencePath,
        '-vf', `crop=${width}:${height}:${x}:${y}`,
        '-frames:v', '1', screenshotPath,
      ])
    }

    const nodes = flatten(frame)
    allNodes.push(...nodes)
    for (const node of nodes.filter((item) => item.vectorPaths || item.fillGeometry)) {
      const asset = {
        name: node.name,
        type: node.type,
        width: node.layout?.width,
        height: node.layout?.height,
        vectorPaths: node.vectorPaths,
        fillGeometry: node.fillGeometry,
        style: node.style,
      }
      const hash = createHash('sha256').update(JSON.stringify(asset)).digest('hex').slice(0, 16)
      const entry = vectorAssets.get(hash) ?? { asset, usages: [] }
      entry.usages.push({ export: config.key, frame: slug, nodeId: node.id })
      vectorAssets.set(hash, entry)
    }

    indexRows.push([
      config.label,
      escapeCell(frame.name),
      `\`${frame.id}\``,
      escapeCell(describeFrame(frame.name)),
      `${width}x${height}`,
      `[JSON](${posix(relative(rootDir, framePath))})`,
      `[PNG](${posix(relative(rootDir, screenshotPath))})`,
    ].join(' | '))
  }
}

writeJson(join(rootDir, 'assets/vector-assets.json'), Object.fromEntries(vectorAssets))
writeFileSync(join(rootDir, 'assets/ASSET_INDEX.md'), `# Asset Index

## Original composite assets

Export | Pixel reference | Vector reference | Rendered fallback
--- | --- | --- | ---
Mobile | [PNG](../mobile/raw/references/001-22_433.png) | [SVG](../mobile/raw/fallbacks/001-22_433.svg) | [PNG](../mobile/raw/fallbacks/001-22_433.png)
Desktop / Tablet / TV | [PNG](../desktop/raw/references/001-32_117.png) | [SVG](../desktop/raw/fallbacks/001-32_117.svg) | [PNG](../desktop/raw/fallbacks/001-32_117.png)

## Indexed vectors

- ${vectorAssets.size} unique vector definitions after deduplication by geometry, size and style.
- Exact paths, fills and every source frame/node usage: [vector-assets.json](vector-assets.json).
- Per-screen raster references are linked from [../DESIGN_INDEX.md](../DESIGN_INDEX.md).

Hash | Name | Size | Usages
--- | --- | --- | ---
${[...vectorAssets].map(([hash, entry]) => {
  const asset = entry.asset as { name?: string; width?: number; height?: number }
  const usages = entry.usages.map((usage) => `\`${usage.export}/${usage.frame}#${usage.nodeId}\``).join(', ')
  return `\`${hash}\` | ${escapeCell(asset.name ?? 'Vector')} | ${asset.width ?? '?'}x${asset.height ?? '?'} | ${usages}`
}).join('\n')}
`)
writeFileSync(join(rootDir, 'DESIGN_INDEX.md'), `# Design Index

Generated from the two local Figma Capture exports. Rows represent top-level child frames; technical \`EXPORT_*\` containers are excluded.

Platform | Frame / state | Figma node | Purpose / state | Size | Data | Render
--- | --- | --- | --- | --- | --- | ---
${indexRows.join('\n')}

## Original assets

- Mobile raw export: [mobile/raw](mobile/raw/)
- Desktop raw export: [desktop/raw](desktop/raw/)
- Deduplicated vectors: [assets/vector-assets.json](assets/vector-assets.json)
- Per-frame screenshots contain unscaled pixel crops from each export's original reference PNG.
`)

const fonts = unique(allNodes.filter((node) => node.type === 'TEXT' && node.style?.fontFamily).map((node) => [
  node.style?.fontFamily,
  node.style?.fontStyleName,
  node.style?.fontWeight,
  node.style?.fontSize,
].join('|')))
const gradients = unique(allNodes.flatMap((node) => fillsOf(node).filter((fill) => fill.type === 'gradient').map((fill) => JSON.stringify({
  css: fill.css,
  opacity: fill.opacity ?? 1,
  transform: fill.transform,
}))))
const colors = unique(allNodes.flatMap((node) => collectColors(node.style))).sort()
const radii = unique(allNodes.map((node) => JSON.stringify(node.style?.borderRadius)).filter((value) => value !== undefined && value !== 'undefined'))
const strokes = unique(allNodes.filter((node) => node.style?.strokes).map((node) => JSON.stringify({
  strokes: node.style?.strokes,
  width: node.style?.borderWidth,
  align: node.style?.strokeAlign,
  dash: node.style?.strokeDashPattern,
})))
const effects = unique(allNodes.filter((node) => node.style?.effects).map((node) => JSON.stringify(node.style?.effects)))

writeFileSync(join(rootDir, 'DESIGN_SYSTEM.md'), designSystemMarkdown({ fonts, gradients, colors, radii, strokes, effects, vectorCount: vectorAssets.size }))

function flatten(root: NodeRecord): NodeRecord[] {
  return [root, ...(root.children ?? []).flatMap(flatten)]
}

function collectScreenFrames(nodes: NodeRecord[]): NodeRecord[] {
  return nodes.flatMap((node) => {
    if (node.name.startsWith('EXPORT_')) return collectScreenFrames(node.children ?? [])
    return node.type === 'FRAME' ? [node] : []
  })
}

function fillsOf(node: NodeRecord): Array<Record<string, unknown>> {
  return Array.isArray(node.style?.fills) ? node.style.fills as Array<Record<string, unknown>> : []
}

function collectColors(value: unknown): string[] {
  if (!value || typeof value !== 'object') return []
  return Object.entries(value).flatMap(([key, child]) => {
    if ((key === 'color' || key === 'backgroundColor' || key === 'borderColor') && typeof child === 'string' && child.startsWith('#')) return [child]
    return collectColors(child)
  })
}

function unique(values: string[]): string[] {
  return [...new Set(values)]
}

function writeJson(path: string, value: unknown) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`)
}

function slugify(value: string): string {
  return value.toLowerCase().normalize('NFKD').replace(/[^a-zа-яё0-9]+/giu, '-').replace(/^-|-$/g, '')
}

function describeFrame(name: string): string {
  if (name.startsWith('Фон - ')) return `Background reference: ${name.slice(6)}`
  const separator = name.indexOf(' - ')
  if (separator >= 0) return `${name.slice(0, separator)}; state: ${name.slice(separator + 3)}`
  return `Base state: ${name}`
}

function escapeCell(value: string): string {
  return value.replaceAll('|', '\\|').replaceAll('\n', ' ')
}

function posix(value: string): string {
  return value.replaceAll('\\', '/')
}

function designSystemMarkdown(data: { fonts: string[]; gradients: string[]; colors: string[]; radii: string[]; strokes: string[]; effects: string[]; vectorCount: number }): string {
  const fontRows = data.fonts.map((font) => {
    const [family, style, weight, size] = font.split('|')
    return `${family} | ${style} | ${weight} | ${size}px`
  }).join('\n')
  const gradientRows = data.gradients.map((value, index) => {
    const gradient = JSON.parse(value)
    return `${index + 1} | \`${gradient.css}\` | ${gradient.opacity} | \`${JSON.stringify(gradient.transform)}\``
  }).join('\n')

  return `# Design System

Only repeated or reusable values extracted from the local Mobile and Desktop Figma exports are listed here. Screen-specific geometry stays in each frame JSON.

## Fonts and typography

Family | Style | Weight | Size
--- | --- | --- | ---
${fontRows}

- Display and button family: **El Messiri**.
- Body and supporting text family: **Brygada 1918**.
- Mobile recurring sizes: 13, 15, 16, 20, 24, 32, 37.13px.
- Wide recurring sizes: 16, 20, 24, 25, 32, 36.92, 45px.

## Main colors

${data.colors.map((color) => `- \`${color}\``).join('\n')}

## Gradients

The transform column is the original Figma gradient transform; use it when CSS direction cannot be inferred from the shorthand alone.

# | Stops | Opacity | Figma transform
--- | --- | --- | ---
${gradientRows}

## Radius

${data.radii.map((radius) => `- \`${radius}\``).join('\n')}

Recurring component radii: 43.5px for 80px pill buttons, 50.19px for 92px wide pill buttons, 20px for card surfaces, and 10px for dialogs.

## Strokes

${data.strokes.length ? data.strokes.map((stroke) => `- \`${stroke}\``).join('\n') : '- No reusable explicit strokes.'}

## Shadows and effects

${data.effects.length ? data.effects.map((effect) => `- \`${effect}\``).join('\n') : '- No reusable shadows/effects are present in the exported screen frames.'}

## Standard buttons

- Mobile primary navigation: 178x80px in paired layouts or 366x80px full-width; radius 43.5px; El Messiri Bold 32px.
- Wide primary navigation: 295x80px; radius 43.5px; El Messiri Bold 32px.
- Truth choice: \`#00AD1D -> #00FF33\`, opacity 0.9, original Figma transform \`[[-1,0,1],[0,-0.12,0.56]]\`.
- Dare choice: \`#BE4244 -> #FF0004\`, original Figma transform \`[[-1,0,1],[0,-0.12,0.56]]\`.
- Disabled controls use reduced opacity and are not focusable, as stated in DevNotes.

## Action buttons

- Mobile action controls use a 64x64px circular surface and approximately 32px vector artwork.
- Exact paths, fills and usage locations for ${data.vectorCount} unique vector assets are in [assets/vector-assets.json](assets/vector-assets.json).
- Repeated action gradients include green \`#00FF33 -> #ECFFC7\`, yellow \`#FFDD00 -> #FF952B\`, purple \`#7642BE -> #E897DA\`, blue \`#4269BE -> #97B0E4\`, and red \`#FF0004 -> #FAA8A9\`.

## Dialog / modal

- Mobile: 366x148px, radius 10px; title El Messiri Bold 24px; body Brygada 1918 Regular 20px; actions El Messiri Bold 20px.
- Wide: 400x148px, radius 10px; same 24/20/20px typography.
- Content inset is approximately 14-15px. Actions occupy two equal columns in the lower 50px.

## Focus and disabled states

- Focus navigation is independent of device type and must work with keyboard/remote controls.
- Focus on light elements is green; focus on green elements is black.
- Disabled elements are visually translucent and must be skipped by focus navigation.

## Spacing and layout

- Mobile reference viewport: 424x917px; recurring horizontal gutter: 29px.
- Wide reference viewport: 1440x1024px; recurring horizontal gutter: 100px; content has a maximum width rather than stretching indefinitely.
- Bottom Back/Next controls are fixed; content alone scrolls and may pass behind the translucent navigation layer.
- Wide grids reduce their column count as space narrows and eventually become the mobile layout.
- Large decorative circles are 1012x1012px and clipped by the screen frame.
`
}
