/**
 * Shuffles a given list in-place using the Fisher-Yates shuffle algorithm.
 *
 * @param list The list to be shuffled. Will be shuffled in-place rather than returning a copy.
 */
export const shuffleList = (list: unknown[]) => {
  // Go through the list, starting at the highest index and stopping at the second-to-last index (1)
  for (let i = list.length - 1; i > 0; i--) {
    // Generate a random number between 0 and the current index (inclusive)
    const j = Math.floor(Math.random() * (i + 1))
    // Swap index i and index j (may be the same index)
    if (i !== j) {
      const iValue = list[i]
      list[i] = list[j]
      list[j] = iValue
    }
  }
}

export interface RollSuitsOptions {
  /** Draw without replacement — each suit can appear at most once per roll set. */
  withoutReplace?: boolean
  /** Number of suit strings to generate. */
  numRolls?: number
  /** Include 'bird' as a fourth suit option in the pool. */
  includeBird?: boolean
  includeFrog?: boolean
}

const BASE_SUITS = ['fox', 'mouse', 'rabbit'] as const

/**
 * Generates an array of randomly rolled suits for hireling placement rules (e.g. randomSuit).
 * Reroll for each step by calling with fresh params; callers should use useMemo keyed to
 * the current hireling/step to ensure consistent rolls within a step.
 *
 * @param options Configuration for the roll behavior.
 * @returns Array of suit strings, length = numRolls.
 */
export const rollSuits = (options: RollSuitsOptions = {}): string[] => {
  const {
    withoutReplace = false,
    numRolls = 1,
    includeBird = false,
    includeFrog = false,
  } = options

  const pool = includeBird ? (includeFrog ? [...BASE_SUITS, 'bird', 'frog'] : [...BASE_SUITS, 'bird']) : (includeFrog ? [...BASE_SUITS, 'frog'] : [...BASE_SUITS])

  if (withoutReplace) {
    shuffleList(pool)
    return pool.slice(0, Math.min(numRolls, pool.length)).map(s => s)
  }

  const result: string[] = []
  for (let i = 0; i < numRolls; i++) {
    result.push(pool[Math.floor(Math.random() * pool.length)]!)
  }
  return result
}

/**
 * Removes a random element from a given list, and then returns it.
 *
 * @param list The list of elements to be randomly selected.
 * @returns The element removed.
 */
export const takeRandom = <T>(list: T[]): T => {
  // Get a random index in the given list (i.e. between 0 inclusive and list.length exclusive)
  const i = Math.floor(Math.random() * list.length)
  // Save value at given index so we can return it
  const returnVal = list[i]!
  // Delete 1 element starting at chosen index
  list.splice(i, 1)
  return returnVal
}
