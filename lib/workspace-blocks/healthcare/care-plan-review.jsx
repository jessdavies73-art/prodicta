'use client'
import BlockPlaceholder from '../office/_BlockPlaceholder'
import { BLOCK_CATALOGUE } from './catalogue'

export const metadata = BLOCK_CATALOGUE['care-plan-review']

export default function CarePlanReviewBlock(props) {
  return <BlockPlaceholder metadata={metadata} {...props} />
}
