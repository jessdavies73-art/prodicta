'use client'
import BlockPlaceholder from '../office/_BlockPlaceholder'
import { BLOCK_CATALOGUE } from './catalogue'

export const metadata = BLOCK_CATALOGUE['patient-family-conversation']

export default function PatientFamilyConversationBlock(props) {
  return <BlockPlaceholder metadata={metadata} {...props} />
}
