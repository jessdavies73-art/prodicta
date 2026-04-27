'use client'
import BlockPlaceholder from '../office/_BlockPlaceholder'
import { BLOCK_CATALOGUE } from './catalogue'

export const metadata = BLOCK_CATALOGUE['conversation-simulation']

export default function EducationConversationSimulationBlock(props) {
  return <BlockPlaceholder metadata={metadata} {...props} />
}
