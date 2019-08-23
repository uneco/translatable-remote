import { SUPPORTED_REGIONS } from 'firebase-functions/lib/function-configuration'

export type Region = typeof SUPPORTED_REGIONS[number]
const DEFAULT_REGION = 'asia-northeast1'

export function isSupportedRegion(region: string): region is Region {
  return SUPPORTED_REGIONS.includes(region as any)
}

export function getRegion () {
  if (process.env.REGION) {
    if (!isSupportedRegion(process.env.REGION)) {
      throw new Error(`environment-specified region '${process.env.REGION}' is not supported`)
    }
    return process.env.REGION
  }
  return DEFAULT_REGION
}
