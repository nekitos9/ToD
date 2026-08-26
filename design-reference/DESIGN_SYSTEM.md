# Design System

Only repeated or reusable values extracted from the local Mobile and Desktop Figma exports are listed here. Screen-specific geometry stays in each frame JSON.

## Fonts and typography

Family | Style | Weight | Size
--- | --- | --- | ---
El Messiri | Bold | 700 | 37.13px
Brygada 1918 | Regular | 400 | 13px
El Messiri | Bold | 700 | 32px
Brygada 1918 | Regular | 400 | 20px
El Messiri | Regular | 400 | 15px
El Messiri | Bold | 700 | 24px
Brygada 1918 | Regular | 400 | 19px
El Messiri | Bold | 700 | 17px
Brygada 1918 | Regular | 400 | 24px
El Messiri | Bold | 700 | 20px
El Messiri | Bold | 700 | 45px
Brygada 1918 | Regular | 400 | 16px
Brygada 1918 | Regular | 400 | 25px
El Messiri | Bold | 700 | 29px
El Messiri | Bold | 700 | 18.62px
El Messiri | Bold | 700 | 36.92px
El Messiri | Regular | 400 | 18px

- Display and button family: **El Messiri**.
- Body and supporting text family: **Brygada 1918**.
- Mobile recurring sizes: 13, 15, 16, 20, 24, 32, 37.13px.
- Wide recurring sizes: 16, 20, 24, 25, 32, 36.92, 45px.

## Main colors

- `#000000`
- `#00AD1D`
- `#00FF33`
- `#212121`
- `#4269BE`
- `#427CBE`
- `#5081C1`
- `#58981C`
- `#5AA092`
- `#696969`
- `#7642BE`
- `#8A38F5`
- `#9242BE`
- `#9342BE`
- `#97B0E4`
- `#A6BEDE`
- `#AD0003`
- `#BE4244`
- `#CAA6DE`
- `#CF25E9`
- `#CFCFCF`
- `#D2D2D2`
- `#D9D9D9`
- `#E5E5E5`
- `#E897DA`
- `#ECFFC7`
- `#EEEEEE`
- `#FAA8A9`
- `#FF0004`
- `#FF2A2D`
- `#FF952B`
- `#FFDD00`
- `#FFFFFF`

## Gradients

The transform column is the original Figma gradient transform; use it when CSS direction cannot be inferred from the shorthand alone.

# | Stops | Opacity | Figma transform
--- | --- | --- | ---
1 | `linear-gradient(#427CBE 0%, #427CBE 100%)` | 1 | `[[0,1,0],[-1,0,1]]`
2 | `linear-gradient(#00FF33 0%, #ECFFC7 100%)` | 1 | `[[0,1,0],[-1,0,1]]`
3 | `linear-gradient(#FFDD00 0%, #FF952B 100%)` | 1 | `[[0,1,0],[-1,0,1]]`
4 | `linear-gradient(#7642BE 0%, #E897DA 100%)` | 1 | `[[0,1,0],[-1,0,1]]`
5 | `linear-gradient(#4269BE 0%, #97B0E4 100%)` | 1 | `[[0,1,0],[-1,0,1]]`
6 | `linear-gradient(#FF0004 0%, #FAA8A9 100%)` | 1 | `[[0,1,0],[-1.43,0,1]]`
7 | `linear-gradient(#FF0004 0%, #FAA8A9 100%)` | 1 | `[[0,1,0],[-1,0,1]]`
8 | `linear-gradient(#00AD1D 0%, #00FF33 100%)` | 0.9 | `[[-1,0,1],[0,-0.12,0.56]]`
9 | `linear-gradient(#BE4244 0%, #FF0004 100%)` | 1 | `[[-1,0,1],[0,-0.12,0.56]]`
10 | `linear-gradient(#7642BE 0%, #7642BE 100%)` | 1 | `[[0,1,0],[-1,0,1]]`
11 | `linear-gradient(#9242BE 55%, #9242BE 100%)` | 1 | `[[0,1,0],[-1,0,1]]`
12 | `linear-gradient(#427CBE 55%, #427CBE 100%)` | 1 | `[[0,1,0],[-1,0,1]]`
13 | `linear-gradient(#4269BE 0%, #4269BE 100%)` | 1 | `[[0,1,-0.45],[-1,0,1.86]]`
14 | `linear-gradient(#4269BE 0%, #4269BE 100%)` | 1 | `[[0,1,0],[-1,0,1]]`

## Radius

- `43.5`
- `10`
- `25`
- `20`
- `29`
- `3`
- `5`
- `11.5`
- `1000`
- `15`
- `42.04`
- `5.04`
- `28.5`
- `1095.01`
- `10000`
- `50.19`
- `100`

Recurring component radii: 43.5px for 80px pill buttons, 50.19px for 92px wide pill buttons, 20px for card surfaces, and 10px for dialogs.

## Strokes

- `{"strokes":[{"type":"solid","sourceType":"SOLID","opacity":0.5,"color":"#7642BE"}],"width":3.25,"align":"center","dash":[]}`
- `{"strokes":[{"type":"solid","sourceType":"SOLID","color":"#8A38F5"}],"width":1,"align":"inside","dash":[10,5]}`
- `{"strokes":[{"type":"solid","sourceType":"SOLID","color":"#4269BE"}],"width":1,"align":"inside","dash":[]}`
- `{"strokes":[{"type":"solid","sourceType":"SOLID","color":"#7642BE"}],"width":3.25,"align":"center","dash":[]}`

## Shadows and effects

- No reusable shadows/effects are present in the exported screen frames.

## Standard buttons

- Mobile primary navigation: 178x80px in paired layouts or 366x80px full-width; radius 43.5px; El Messiri Bold 32px.
- Wide primary navigation: 295x80px; radius 43.5px; El Messiri Bold 32px.
- Truth choice: `#00AD1D -> #00FF33`, opacity 0.9, original Figma transform `[[-1,0,1],[0,-0.12,0.56]]`.
- Dare choice: `#BE4244 -> #FF0004`, original Figma transform `[[-1,0,1],[0,-0.12,0.56]]`.
- Disabled controls use reduced opacity and are not focusable, as stated in DevNotes.

## Action buttons

- Mobile action controls use a 64x64px circular surface and approximately 32px vector artwork.
- Exact paths, fills and usage locations for 33 unique vector assets are in [assets/vector-assets.json](assets/vector-assets.json).
- Repeated action gradients include green `#00FF33 -> #ECFFC7`, yellow `#FFDD00 -> #FF952B`, purple `#7642BE -> #E897DA`, blue `#4269BE -> #97B0E4`, and red `#FF0004 -> #FAA8A9`.

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
