'use client'
import BlockPlaceholder from '../office/_BlockPlaceholder'
import { BLOCK_CATALOGUE } from './catalogue'

export const metadata = BLOCK_CATALOGUE['behaviour-incident']

export default function BehaviourIncidentBlock(props) {
  return <BlockPlaceholder metadata={metadata} {...props} />
}
