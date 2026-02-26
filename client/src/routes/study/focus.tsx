import { createFileRoute } from '@tanstack/react-router'
import { FocusMode } from '../../pages/focus';

export const Route = createFileRoute('/study/focus')({
  component: FocusMode,
})
