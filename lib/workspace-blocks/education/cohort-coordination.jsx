'use client'
import BlockPlaceholder from '../office/_BlockPlaceholder'
import { BLOCK_CATALOGUE } from './catalogue'

export const metadata = BLOCK_CATALOGUE['cohort-coordination']

export default function CohortCoordinationBlock(props) {
  return <BlockPlaceholder metadata={metadata} {...props} />
}
