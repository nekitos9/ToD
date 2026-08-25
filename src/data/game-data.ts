export type CardType = 'truth' | 'dare'

export interface CardTypeDefinition {
  readonly type: CardType
  readonly name: string
  readonly description: string
}

export interface BoundaryDefinition {
  readonly name: string
  readonly level: number
  readonly description: string
}

export interface PackDefinition {
  readonly name: string
  readonly description: string
  readonly cardCount: number
  readonly availableTypes: readonly CardType[]
}

export interface GameCard {
  readonly id: string
  readonly text: string
  readonly type: CardType
  readonly pack: string
  readonly boundary: string
  readonly relationshipAllowed: boolean
  readonly otherPlayers: number
}

export interface GameData {
  readonly source: string
  readonly cards: readonly GameCard[]
  readonly packs: readonly PackDefinition[]
  readonly boundaries: readonly BoundaryDefinition[]
  readonly cardTypes: readonly CardTypeDefinition[]
  readonly summary: {
    readonly cardCount: number
    readonly packCount: number
    readonly boundaryCount: number
    readonly cardTypeCount: number
  }
}

