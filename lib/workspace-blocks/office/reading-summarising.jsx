'use client'
import BlockPlaceholder from './_BlockPlaceholder'
import { BLOCK_CATALOGUE } from './catalogue'

export const metadata = BLOCK_CATALOGUE['reading-summarising']

export default function ReadingSummarisingBlock(props) {
  return <BlockPlaceholder metadata={metadata} {...props} />
}
