'use client'
import BlockPlaceholder from './_BlockPlaceholder'
import { BLOCK_CATALOGUE } from './catalogue'

export const metadata = BLOCK_CATALOGUE['decision-queue']

export default function DecisionQueueBlock(props) {
  return <BlockPlaceholder metadata={metadata} {...props} />
}
