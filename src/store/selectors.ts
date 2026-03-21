import { createSelector } from '@reduxjs/toolkit'

import type { RootState } from '.'
import type { FlowSlice, HirelingCode, LandmarkCode } from '../types'

import {
  selectCaptainArray,
  selectDeckArray,
  selectFactionArray,
  selectHirelingArray,
  selectLandmarkArray,
  selectMapArray,
  selectVagabondArray,
} from './slices/components'
import { selectSetupClearings, selectSetupDeckCode, selectSetupMapCode } from './slices/setup'
import { currySelector } from './utils'

/** Returns the faction pool, with all faction, vagabond, and captain information included. */
export const selectFactionPoolFull = currySelector(
  createSelector(
    (_state: RootState, flowSlice: FlowSlice) => flowSlice.factionPool,
    selectFactionArray,
    selectVagabondArray,
    selectCaptainArray,
    (factionPool, factionArray, vagabondArray, captainArray) =>
      factionPool.map(({ code, vagabond, captains }) => ({
        ...factionArray.find(({ code: factionCode }) => factionCode === code)!,
        vagabond:
          typeof vagabond === 'string'
            ? vagabondArray.find(({ code: vagabondCode }) => vagabondCode === vagabond)
            : undefined,
        captains: Array.isArray(captains)
          ? captains.map(
              captain => captainArray.find(({ code: captainCode }) => captainCode === captain)!,
            )
          : [],
      })),
  ),
)

/** Hireling definition by code (from enabled components + definitions). */
export const selectHirelingByCode = currySelector(
  createSelector(
    selectHirelingArray,
    (_state: RootState, code: HirelingCode | null | undefined) => code,
    (hirelingArray, code) =>
      code ? (hirelingArray.find(h => h.code === code) ?? null) : null,
  ),
)

/** Landmark definition by code. */
export const selectLandmarkByCode = currySelector(
  createSelector(
    selectLandmarkArray,
    (_state: RootState, code: LandmarkCode | null | undefined) => code,
    (landmarkArray, code) =>
      code ? (landmarkArray.find(l => l.code === code) ?? null) : null,
  ),
)

/** Returns the hireling pool with all hireling information included. */
export const selectHirelingPoolFull = currySelector(
  createSelector(
    (_state: RootState, flowSlice: FlowSlice) => flowSlice.hirelingPool,
    selectHirelingArray,
    (hirelingPool, hirelingArray) =>
      hirelingPool.map(entry => ({
        ...hirelingArray.find(({ code: hirelingCode }) => hirelingCode === entry.code)!,
        ...entry,
      })),
  ),
)

/** Returns the landmark pool with all landmark information included. */
export const selectLandmarkPoolFull = currySelector(
  createSelector(
    (_state: RootState, flowSlice: FlowSlice) => flowSlice.landmarkPool,
    selectLandmarkArray,
    (landmarkPool, landmarkArray) =>
      landmarkPool.map(
        code => landmarkArray.find(({ code: landmarkCode }) => landmarkCode === code)!,
      ),
  ),
)

/** Returns the object for the deck selected in setup. */
export const selectSetupDeck = createSelector(
  selectSetupDeckCode,
  selectDeckArray,
  (deckCode, deckArray) => deckArray.find(({ code }) => code === deckCode),
)

/**
 * Returns the hydrated map object for the map selected in setup, including resolved clearings,
 * landmark data, and the path/forest coordinate arrays needed for hireling placement rendering.
 */
export const selectSetupMap = createSelector(
  selectSetupMapCode,
  selectSetupClearings,
  selectMapArray,
  selectLandmarkArray,
  (mapCode, setupClearings, mapArray, landmarkArray) => {
    const setupMap = mapArray.find(({ code }) => code === mapCode)
    return (
      setupMap && {
        ...setupMap,
        clearings: setupMap.clearings.map((baseClearing, index) => {
          const setupClearing = setupClearings[index]
          return {
            ...baseClearing,
            ...setupClearing,
            suitLandmark: setupClearing?.suitLandmark
              ? landmarkArray.find(({ code }) => code === setupClearing.suitLandmark)
              : undefined,
          }
        }),
        landmark: setupMap.landmark && {
          ...landmarkArray.find(({ code }) => code === setupMap.landmark!.code)!,
          ...setupMap.landmark,
        },
        pathCoords: setupMap.pathCoords ?? [],
        forestCoords: setupMap.forestCoords ?? [],
      }
    )
  },
)

/**
 * Map clearings with base map data merged with setup-time overlay (same as
 * `selectSetupMap(state)?.clearings`). Use this instead of re-merging with `setup.clearings` in
 * components.
 */
export const selectSetupMapClearings = createSelector(
  selectSetupMap,
  setupMap => setupMap?.clearings ?? [],
)
