'use client'
import BlockPlaceholder from '../office/_BlockPlaceholder'
import { BLOCK_CATALOGUE } from './catalogue'

export const metadata = BLOCK_CATALOGUE['safeguarding-incident']

export default function SafeguardingIncidentBlock(props) {
  return <BlockPlaceholder metadata={metadata} {...props} />
}
