'use client'
import BlockPlaceholder from '../office/_BlockPlaceholder'
import { BLOCK_CATALOGUE } from './catalogue'

export const metadata = BLOCK_CATALOGUE['doctor-instruction-handling']

export default function DoctorInstructionHandlingBlock(props) {
  return <BlockPlaceholder metadata={metadata} {...props} />
}
