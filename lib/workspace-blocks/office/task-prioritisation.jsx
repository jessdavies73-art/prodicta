'use client'
import BlockPlaceholder from './_BlockPlaceholder'
import { BLOCK_CATALOGUE } from './catalogue'

export const metadata = BLOCK_CATALOGUE['task-prioritisation']

export default function TaskPrioritisationBlock(props) {
  return <BlockPlaceholder metadata={metadata} {...props} />
}
