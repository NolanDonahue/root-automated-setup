import type { ClearingSuit, Hireling, Landmark, SetupClearing, SetupMapState } from '../types'

/**
 * Validates whether a hireling can be placed in the given clearing.
 *
 * @param clearingIndex The index of the clearing being evaluated.
 * @param clearingData The resolved clearing data (base + dynamic state merged).
 * @param hireling The hireling definition containing placement rules.
 * @param currentSelections Indexes of clearings already selected for this hireling this step.
 * @param mapData The hydrated map state, required for matchFirstSuit suit lookup.
 * @param randomRolledSuit The suit randomly rolled for a randomSuit hireling, if applicable.
 */
export const validateHirelingPlacement = (
  clearingIndex: number,
  clearingData: SetupClearing,
  hireling: Hireling,
  currentSelections: number[],
  mapData?: SetupMapState,
  randomRolledSuit?: string,
): boolean => {
  if (!hireling.allowSameClearing && currentSelections.includes(clearingIndex)) {
    return false
  }

  if (!hireling.placementRules || hireling.placementRules.length === 0) {
    return true
  }

  for (const rule of hireling.placementRules) {
    switch (rule) {
      case 'allClearings':
        if (clearingData.flooded) return false
        break

      case 'allRuins':
        if (!clearingData.ruin) return false
        break

      // Non-clearing placement mode — no clearing is a valid target
      case 'forest':
        return false

      // Non-clearing placement mode — no clearing is a valid target
      case 'path':
        return false

      case 'openBuildingSlot':
        if ((clearingData.buildingSlots ?? 0) === 0 || clearingData.flooded) return false
        break

      case 'ruin':
        if (!clearingData.ruin) return false
        break

      case 'mapEdge':
        if (!clearingData.mapEdge) return false
        break

      case 'river':
        if (!clearingData.coastal) return false
        break

      case 'matchFirstSuit':
        if (currentSelections.length === 0) {
          if (clearingData.suit === 'none') return false
        } else {
          const firstClearing = mapData?.clearings[currentSelections[0]!]
          const firstSuit = firstClearing?.suit
          if (!firstSuit || clearingData.suit !== firstSuit) return false
        }
        break

      case 'allSuitsOnce': {
        if (clearingData.suit === 'none') return false

        const usedSuits = currentSelections
          .map(idx => mapData?.clearings[idx]?.suit)
          .filter((s): s is ClearingSuit => s !== undefined && s !== 'none')

        if (usedSuits.includes(clearingData.suit)) return false
        break
      }

      case 'randomSuit':
        if (clearingData.suit !== randomRolledSuit) return false
        break
    }
  }

  return true
}

/**
 * Validates whether a landmark can be placed in the given clearing. Enforces the rule that no two
 * landmarks share or are adjacent to the same clearing.
 *
 * @param clearingIndex The index of the clearing being evaluated.
 * @param clearingData The resolved clearing data (base + dynamic state merged).
 * @param placedLandmarks The current placed landmark record from flow state.
 * @param landmark The landmark definition containing placement rules.
 */
export const validateLandmarkPlacement = (
  clearingIndex: number,
  clearingData: SetupClearing,
  placedLandmarks: Record<string, number[]>,
  landmark: Landmark,
): boolean => {
  const placedClearings = Object.values(placedLandmarks).flat()

  if (placedClearings.includes(clearingIndex)) {
    return false
  }

  const isAdjacentToLandmark = clearingData.adjacentClearings?.some(adjIndex =>
    placedClearings.includes(adjIndex),
  )
  if (isAdjacentToLandmark) {
    return false
  }

  if (!landmark.placementRules || landmark.placementRules.length === 0) {
    return true
  }

  for (const rule of landmark.placementRules) {
    switch (rule) {
      case 'ruin':
        if (!clearingData.ruin) return false
        break

      case 'corner':
        if (!clearingData.corner) return false
        break

      case 'singleSlot':
        if (clearingData.buildingSlots !== 1 || clearingData.ruin) return false
        break

      case 'river':
        if (!clearingData.coastal) return false
        break

      case 'fox':
        if (clearingData.suit !== 'fox') return false
        break

      case 'mouse':
        if (clearingData.suit !== 'mouse') return false
        break

      case 'rabbit':
        if (clearingData.suit !== 'rabbit') return false
        break
    }
  }

  return true
}
