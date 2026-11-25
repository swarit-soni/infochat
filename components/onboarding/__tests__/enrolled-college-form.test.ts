import { describe, expect, it } from 'vitest'

import {
  buildOnboardingOptions,
  type CollegeOption
} from '../enrolled-college-form'

const sampleCollege = (value: string, label = value): CollegeOption => ({
  value,
  label,
  description: '',
  campuses: []
})

describe('buildOnboardingOptions', () => {
  it('places sera-demo at the top followed by Not enrolled yet and the rest in order', () => {
    const colleges = [
      sampleCollege('kalvium', 'Kalvium'),
      sampleCollege('jecrc', 'JECRC University'),
      sampleCollege('bkbirla', 'B.K. Birla College'),
      sampleCollege('sera-demo', 'Sera Demo University (fictional)'),
      sampleCollege('iitm', 'IIT Madras')
    ]

    const result = buildOnboardingOptions(colleges)

    expect(result.map(option => option.value)).toEqual([
      'sera-demo',
      'none',
      'kalvium',
      'jecrc',
      'bkbirla',
      'iitm'
    ])
  })

  it('places Not enrolled yet first when sera-demo is absent', () => {
    const colleges = [
      sampleCollege('kalvium', 'Kalvium'),
      sampleCollege('jecrc', 'JECRC University')
    ]

    const result = buildOnboardingOptions(colleges)

    expect(result.map(option => option.value)).toEqual([
      'none',
      'kalvium',
      'jecrc'
    ])
  })
})
