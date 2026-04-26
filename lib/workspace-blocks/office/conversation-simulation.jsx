'use client'
import BlockPlaceholder from './_BlockPlaceholder'
import { BLOCK_CATALOGUE } from './catalogue'

export const metadata = BLOCK_CATALOGUE['conversation-simulation']

export default function ConversationSimulationBlock(props) {
  return <BlockPlaceholder metadata={metadata} {...props} />
}
