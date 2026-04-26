'use client'
import BlockPlaceholder from './_BlockPlaceholder'
import { BLOCK_CATALOGUE } from './catalogue'

export const metadata = BLOCK_CATALOGUE['slack-teams']

export default function SlackTeamsBlock(props) {
  return <BlockPlaceholder metadata={metadata} {...props} />
}
