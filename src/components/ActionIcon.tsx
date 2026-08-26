import { useId } from 'react'
import { actionIconData } from './action-icon-data.generated'

export type ActionIconName = 'complete' | 'skip' | 'reroll' | 'change-question'

const gradients = {
  complete: ['#00FF33', '#ECFFC7'],
  skip: ['#FFDD00', '#FF952B'],
  reroll: ['#7642BE', '#E897DA'],
  'change-question': ['#4269BE', '#97B0E4'],
} as const

export function ActionIcon({ name }: { readonly name: ActionIconName }) {
  const gradientId = useId()
  const [start, end] = gradients[name]

  if (name === 'change-question') {
    const main = actionIconData.question
    const small = actionIconData.questionSmall

    return (
      <svg aria-hidden="true" className="action-icon--composite" viewBox="0 0 64 64">
        <Gradient end={end} id={gradientId} start={start} />
        <path d={main.path} fill={`url(#${gradientId})`} transform="translate(21.75 15)" />
        <path d={small.path} fill={`url(#${gradientId})`} transform="matrix(.88 .47 -.47 .88 43.02 31.63)" />
        <path d={small.path} fill={`url(#${gradientId})`} transform="matrix(.88 -.47 .47 .88 12 36.09)" />
      </svg>
    )
  }

  const vector = actionIconData[name]
  return (
    <svg aria-hidden="true" viewBox={`0 0 ${vector.width} ${vector.height}`}>
      <Gradient end={end} id={gradientId} start={start} />
      <path d={vector.path} fill={`url(#${gradientId})`} />
    </svg>
  )
}

function Gradient({ end, id, start }: { readonly end: string; readonly id: string; readonly start: string }) {
  return (
    <defs>
      <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stopColor={start} />
        <stop offset="1" stopColor={end} />
      </linearGradient>
    </defs>
  )
}
