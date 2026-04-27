'use client'
import BlockPlaceholder from '../office/_BlockPlaceholder'
import { BLOCK_CATALOGUE } from './catalogue'

export const metadata = BLOCK_CATALOGUE['parent-communication']

export default function ParentCommunicationBlock(props) {
  return <BlockPlaceholder metadata={metadata} {...props} />
}
