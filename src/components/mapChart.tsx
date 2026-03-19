import React from 'react'

import { ICON_DICTIONARY } from '../constants'
import { useAppSelector } from '../hooks'
import priorityToken from '../images/charts/markers/priority.svg'
import ruinBuilding from '../images/charts/markers/ruin.png'
import { selectHirelingArray, selectLandmarkArray, selectSetupMap } from '../store'
import LocaleText from './localeText'

interface MapData {
  code: string
  backImage: string
  floodImage?: string
  useLandmark?: boolean
  botPriorities?: number[]
  suitLandmarks?: Record<string, string>
  landmark?: {
    clearing: number
    x: number
    y: number
    angle?: number
    image: string
    code: string
  }
  clearings: {
    x: number
    y: number
    suit: keyof typeof ICON_DICTIONARY | null
    flooded?: boolean
    ruin?: boolean
  }[]
  pathCoords: [number, number][]
  forestCoords: [number, number][]
}

interface MapChartProps {
  onClearingClick?: (index: number) => void
  activeLandmark?: string
  validClearings?: number[]
  selectedClearings?: number[]
  validForestIndexes?: number[]
  selectedForestIndexes?: number[]
  onForestClick?: (index: number) => void
  validPathIndexes?: number[]
  selectedPathIndexes?: number[]
  onPathClick?: (index: number) => void
  useHouserules?: boolean
}
const ZONE_RADIUS = 50

const MapChart: React.FC<MapChartProps> = ({
  onClearingClick,
  validClearings = [],
  selectedClearings = [],
  validForestIndexes = [],
  selectedForestIndexes = [],
  onForestClick,
  validPathIndexes = [],
  selectedPathIndexes = [],
  onPathClick,
  useHouserules = false,
}) => {
  const map = useAppSelector(selectSetupMap) as MapData | null

  const includeBots = useAppSelector(state => state.setup.botCount > 0)
  const placedLandmarks = useAppSelector(state => state.flow.placedLandmarks)
  const placedHirelings = useAppSelector(state => state.flow.placedHirelings)
  const landmarks = useAppSelector(selectLandmarkArray)
  const hirelings = useAppSelector(selectHirelingArray)
  const mountainLandmarkCode = useAppSelector(state => state.setup.mountainLandmarkCode)

  /**
   * Clearings → which landmark/hireling images to stack there. Forest and path hirelings are
   * intentionally excluded here — their stored indexes are zone indexes, not clearing indexes. They
   * render in the forest/path zone loops below using piecesByForestZone / piecesByPathZone.
   */
  const { piecesByClearing, piecesByForestZone, piecesByPathZone } = React.useMemo(() => {
    const clearingGrouping: Record<
      number,
      { landmarks: typeof landmarks; hirelings: typeof hirelings }
    > = {}
    const forestGrouping: Record<number, typeof hirelings> = {}
    const pathGrouping: Record<number, typeof hirelings> = {}

    Object.entries(placedLandmarks).forEach(([code, clearingIndexes]) => {
      const def = landmarks.find(l => l.code === code)
      if (def) {
        clearingIndexes.forEach(idx => {
          clearingGrouping[idx] ??= { landmarks: [], hirelings: [] }
          clearingGrouping[idx].landmarks.push(def)
        })
      }
    })

    Object.entries(placedHirelings).forEach(([code, storedIndexes]) => {
      const def = hirelings.find(h => h.code === code)
      if (!def) return
      const rules = def.placementRules ?? []
      const warriorCount = def.warriorCount ?? 1

      if (rules.includes('forest')) {
        // storedIndexes are forest zone indexes
        storedIndexes.forEach(idx => {
          forestGrouping[idx] ??= []
          for (let w = 0; w < warriorCount; w++) {
            forestGrouping[idx].push(def)
          }
        })
      } else if (rules.includes('path')) {
        // storedIndexes are path zone indexes
        storedIndexes.forEach(idx => {
          pathGrouping[idx] ??= []
          for (let w = 0; w < warriorCount; w++) {
            pathGrouping[idx].push(def)
          }
        })
      } else {
        // storedIndexes are clearing indexes
        storedIndexes.forEach(idx => {
          clearingGrouping[idx] ??= { landmarks: [], hirelings: [] }
          for (let w = 0; w < warriorCount; w++) {
            clearingGrouping[idx].hirelings.push(def)
          }
        })
      }
    })

    return {
      piecesByClearing: clearingGrouping,
      piecesByForestZone: forestGrouping,
      piecesByPathZone: pathGrouping,
    }
  }, [placedLandmarks, placedHirelings, landmarks, hirelings])

  if (!map) return null

  const floodedClearings = map.clearings.filter(clearing => clearing.flooded)
  if (map.code === 'mountain' && map.landmark) {
    const overrideLandmark = landmarks.find(l => l.code === mountainLandmarkCode)
    if (overrideLandmark) {
      map.landmark = {
        ...map.landmark,
        code: overrideLandmark.code,
        image: overrideLandmark.image,
      }
    }
  }
  return (
    <svg
      className="map"
      viewBox="0 0 1000 1000"
    >
      <desc>
        <LocaleText i18nKey="label.mapChart" />
      </desc>

      <image
        className="background"
        href={map.backImage}
      />

      {floodedClearings.length > 0 && map.floodImage ? (
        <>
          <mask id="flooded-mask">
            {floodedClearings.map((clearing, index) => (
              <circle
                key={`flood-${index}`}
                cx={clearing.x}
                cy={clearing.y}
                r="90"
                fill="white"
              />
            ))}
          </mask>
          <image
            className="background"
            href={map.floodImage}
            mask="url(#flooded-mask)"
          />
        </>
      ) : null}

      {/* ── Forest zones ─────────────────────────────────────────────────────── */}
      {map.forestCoords.map(([x, y], index) => {
        const isSelected = selectedForestIndexes.includes(index)
        const isValid = validForestIndexes.includes(index)
        const isClickable = onForestClick != null && !isSelected && (isValid || useHouserules)
        const zonePieces = piecesByForestZone[index] ?? []

        return (
          <g
            key={`forest-${index}`}
            onClick={() => {
              if (isClickable) onForestClick(index)
            }}
            style={{ cursor: isSelected ? 'default' : isClickable ? 'pointer' : 'default' }}
          >
            <title>
              <LocaleText i18nKey="label.forest" />
            </title>

            <circle
              cx={x}
              cy={y}
              r={ZONE_RADIUS}
              fill="transparent"
            />

            {isSelected && (
              <circle
                cx={x}
                cy={y}
                r={ZONE_RADIUS + 5}
                fill="none"
                stroke="#22c55e"
                strokeWidth="6"
              />
            )}

            {isValid && !isSelected && (
              <circle
                cx={x}
                cy={y}
                r={ZONE_RADIUS + 5}
                fill="rgba(34,197,94,0.15)"
                stroke="#22c55e"
                strokeWidth="4"
                strokeDasharray="8 4"
              />
            )}

            {/* Hirelings placed in this forest zone */}
            {zonePieces.map((hireling, i) => {
              const size = 60
              return (
                <image
                  key={`forest-hireling-${hireling.code}-${i}`}
                  x={x - size / 2 + i * 18}
                  y={y - size / 2 + i * 18}
                  width={size}
                  height={size}
                  href={hireling.image}
                >
                  <title>
                    <LocaleText i18nKey={`hireling.${hireling.code}.name`} />
                  </title>
                </image>
              )
            })}
          </g>
        )
      })}

      {/* ── Path zones ───────────────────────────────────────────────────────── */}
      {map.pathCoords.map(([x, y], index) => {
        const isSelected = selectedPathIndexes.includes(index)
        const isValid = validPathIndexes.includes(index)
        const isClickable = onPathClick != null && !isSelected && (isValid || useHouserules)
        const zonePieces = piecesByPathZone[index] ?? []

        return (
          <g
            key={`path-${index}`}
            onClick={() => {
              if (isClickable) onPathClick(index)
            }}
            style={{ cursor: isSelected ? 'default' : isClickable ? 'pointer' : 'default' }}
          >
            <title>
              <LocaleText i18nKey="label.path" />
            </title>

            <circle
              cx={x}
              cy={y}
              r={ZONE_RADIUS}
              fill="transparent"
            />

            {isSelected && (
              <circle
                cx={x}
                cy={y}
                r={ZONE_RADIUS + 5}
                fill="none"
                stroke="#f97316"
                strokeWidth="6"
              />
            )}

            {isValid && !isSelected && (
              <circle
                cx={x}
                cy={y}
                r={ZONE_RADIUS + 5}
                fill="rgba(251,191,36,0.15)"
                stroke="#fbbf24"
                strokeWidth="4"
                strokeDasharray="8 4"
              />
            )}

            {/* Hirelings placed on this path zone */}
            {zonePieces.map((hireling, i) => {
              const size = 60
              return (
                <image
                  key={`path-hireling-${hireling.code}-${i}`}
                  x={x - size / 2 + i * 18}
                  y={y - size / 2 + i * 18}
                  width={size}
                  height={size}
                  href={hireling.image}
                >
                  <title>
                    <LocaleText i18nKey={`hireling.${hireling.code}.name`} />
                  </title>
                </image>
              )
            })}
          </g>
        )
      })}

      {/* ── Clearings ────────────────────────────────────────────────────────── */}
      {map.clearings.map(({ x, y, suit, flooded, ruin }, index) => {
        const clearingPieces = piecesByClearing[index] ?? { landmarks: [], hirelings: [] }
        const suitLandmarkCode = suit ? map.suitLandmarks?.[suit] : null
        const suitLandmark = suitLandmarkCode
          ? landmarks.find(l => l.code === suitLandmarkCode)
          : null

        const isAlreadySelected = selectedClearings.includes(index)
        const isTargetValid = validClearings.includes(index)
        const isClickable =
          onClearingClick != null && !isAlreadySelected && (isTargetValid || useHouserules)

        let cursorStyle = 'default'
        if (onClearingClick != null) {
          cursorStyle = isAlreadySelected ? 'default' : isClickable ? 'pointer' : 'not-allowed'
        }

        return (
          <g
            key={index}
            onClick={() => {
              if (isClickable) onClearingClick(index)
            }}
            className={`clearing-group ${isClickable ? 'cursor-pointer' : ''}`}
            style={{ cursor: cursorStyle }}
          >
            <title>
              <LocaleText i18nKey={flooded ? `label.clearing.flooded` : `label.clearing.${suit}`} />
            </title>

            <circle
              cx={x}
              cy={y}
              r="90"
              fill="transparent"
            />

            {isAlreadySelected && (
              <circle
                cx={x}
                cy={y}
                r="95"
                fill="none"
                stroke="#22c55e"
                strokeWidth="6"
              />
            )}

            {isTargetValid && !isAlreadySelected && (
              <circle
                cx={x}
                cy={y}
                r="95"
                fill="none"
                stroke="#fbbf24"
                strokeWidth="6"
                strokeDasharray="10 5"
              />
            )}

            {ruin ? (
              <image
                x={x - 65}
                y={y - 40}
                width="40"
                height="40"
                href={ruinBuilding}
              >
                <title>
                  <LocaleText i18nKey="label.ruin" />
                </title>
              </image>
            ) : null}

            {includeBots && map.botPriorities ? (
              <g>
                <title>
                  <LocaleText
                    i18nKey="label.priority"
                    count={map.botPriorities[index]}
                  />
                </title>
                <image
                  x={x - 55}
                  y={y + 10}
                  width="60"
                  height="60"
                  href={priorityToken}
                />
                <text
                  x={x - 25}
                  y={y + 50}
                  fontSize="30"
                  textAnchor="middle"
                  fill="#fff"
                >
                  {map.botPriorities[index]}
                </text>
              </g>
            ) : null}

            {suitLandmark ? (
              <image
                x={x - 60}
                y={y - 150}
                width="120"
                height="120"
                href={suitLandmark.image}
              >
                <title>
                  <LocaleText i18nKey={`landmark.${suitLandmark.code}.name`} />
                </title>
              </image>
            ) : !flooded && suit && suit !== 'none' ? (
              <image
                x={x - 40}
                y={y - 120}
                width="80"
                height="80"
                href={ICON_DICTIONARY[suit].image}
              >
                <title>
                  <LocaleText i18nKey={`label.suitMarker.${suit}`} />
                </title>
              </image>
            ) : null}

            {map.useLandmark && map.landmark?.clearing === index ? (
              <image
                x={map.landmark.x}
                y={map.landmark.y}
                width="100"
                height="100"
                transform={
                  map.landmark.angle != null
                    ? `rotate(${map.landmark.angle} ${map.landmark.x + 50} ${map.landmark.y + 50})`
                    : undefined
                }
                href={map.landmark.image}
              >
                <title>
                  <LocaleText i18nKey={`landmark.${map.landmark.code}.name`} />
                </title>
              </image>
            ) : null}

            {/* Placed Landmarks (Bottom-Left Quadrant) */}
            {clearingPieces.landmarks.map((landmark, i) => {
              const size = 75
              return (
                <image
                  key={`landmark-${landmark.code}-${i}`}
                  x={x - size + 5 - i * 12}
                  y={y + 5 + i * 12}
                  width={size}
                  height={size}
                  href={landmark.image}
                >
                  <title>
                    <LocaleText i18nKey={`landmark.${landmark.code}.name`} />
                  </title>
                </image>
              )
            })}

            {/* Placed Hirelings (Bottom-Right Quadrant) */}
            {clearingPieces.hirelings.map((hireling, i) => {
              const size = 75
              return (
                <image
                  key={`hireling-${hireling.code}-${i}`}
                  x={x - 5 + i * 22}
                  y={y + 5 + i * 22}
                  width={size}
                  height={size}
                  href={hireling.image}
                >
                  <title>
                    <LocaleText i18nKey={`hireling.${hireling.code}.name`} />
                  </title>
                </image>
              )
            })}

            {/*
      ============================================================
      DEV TOOLS — uncomment the blocks you need, recomment when done
      ============================================================*/}

            {/*// ── GRID OVERLAY: 100px grid with axis labels ────────────────────────*/}
            {Array.from({ length: 11 }).map((_, i) => (
              <g
                key={`grid-${i}`}
                style={{ pointerEvents: 'none' }}
              >
                <line
                  x1={0}
                  y1={i * 100}
                  x2={1000}
                  y2={i * 100}
                  stroke="rgba(255,255,255,0.4)"
                  strokeWidth="2"
                />
                <line
                  x1={i * 100}
                  y1={0}
                  x2={i * 100}
                  y2={1000}
                  stroke="rgba(255,255,255,0.4)"
                  strokeWidth="2"
                />
                <text
                  x={i * 100 + 5}
                  y={20}
                  fill="yellow"
                  fontSize="16"
                  fontWeight="bold"
                >
                  {i * 100}
                </text>
                <text
                  x={5}
                  y={i * 100 - 5}
                  fill="yellow"
                  fontSize="16"
                  fontWeight="bold"
                >
                  {i * 100}
                </text>
              </g>
            ))}

            {/*// ── CLEARING LABELS: index, x, y for each clearing ───────────────────*/}
            {map.clearings.map(({ x, y }, i) => (
              <text
                key={`clabel-${i}`}
                x={x}
                y={y + 5}
                fontSize="24"
                fontWeight="900"
                fill="cyan"
                stroke="black"
                strokeWidth="1.5"
                textAnchor="middle"
                style={{ pointerEvents: 'none' }}
              >
                [{i}] {x},{y}
              </text>
            ))}

            {/*// ── PATH COORD MARKERS: X at each pathCoords entry ───────────────────*/}
            {map.pathCoords.map(([x, y], i) => (
              <g
                key={`pmark-${i}`}
                style={{ pointerEvents: 'none' }}
              >
                <line
                  x1={x - 12}
                  y1={y - 12}
                  x2={x + 12}
                  y2={y + 12}
                  stroke="#f97316"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
                <line
                  x1={x + 12}
                  y1={y - 12}
                  x2={x - 12}
                  y2={y + 12}
                  stroke="#f97316"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
                <text
                  x={x}
                  y={y - 16}
                  fontSize="16"
                  fontWeight="bold"
                  fill="#f97316"
                  stroke="black"
                  strokeWidth="1"
                  textAnchor="middle"
                >
                  P{i}
                </text>
              </g>
            ))}

            {/*// ── FOREST COORD MARKERS: X at each forestCoords entry ───────────────*/}
            {map.forestCoords.map(([x, y], i) => (
              <g
                key={`fmark-${i}`}
                style={{ pointerEvents: 'none' }}
              >
                <line
                  x1={x - 12}
                  y1={y - 12}
                  x2={x + 12}
                  y2={y + 12}
                  stroke="#22c55e"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
                <line
                  x1={x + 12}
                  y1={y - 12}
                  x2={x - 12}
                  y2={y + 12}
                  stroke="#22c55e"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
                <text
                  x={x}
                  y={y - 16}
                  fontSize="16"
                  fontWeight="bold"
                  fill="#22c55e"
                  stroke="black"
                  strokeWidth="1"
                  textAnchor="middle"
                >
                  F{i}
                </text>
              </g>
            ))}

            {/*============================================================ */}
          </g>
        )
      })}
    </svg>
  )
}

export default MapChart
