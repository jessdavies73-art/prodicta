'use client'
import BlockPlaceholder from '../office/_BlockPlaceholder'
import { BLOCK_CATALOGUE } from './catalogue'

export const metadata = BLOCK_CATALOGUE['family-visitor-interaction']

export default function FamilyVisitorInteractionBlock(props) {
  return <BlockPlaceholder metadata={metadata} {...props} />
}
