'use client'
import BlockPlaceholder from '../office/_BlockPlaceholder'
import { BLOCK_CATALOGUE } from './catalogue'

export const metadata = BLOCK_CATALOGUE['patient-handover']

export default function PatientHandoverBlock(props) {
  return <BlockPlaceholder metadata={metadata} {...props} />
}
