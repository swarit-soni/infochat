import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle
} from '@/components/ui/sheet'

// On phones the sidebar is a modal Sheet, which sets `pointer-events: none`
// on <body>. Menus opened from inside it are portaled to <body> and only
// stay tappable if they share the Sheet's dismissable-layer stack. Two
// installed copies of @radix-ui/react-dismissable-layer split that stack,
// so the menu inherited `none` and ignored taps (see the package.json
// override).
describe('dropdown menu inside the mobile sidebar sheet', () => {
  it('re-enables pointer events on the menu while the sheet locks the body', () => {
    render(
      <Sheet open>
        <SheetContent side="left">
          <SheetTitle>Sidebar</SheetTitle>
          <SheetDescription>Mobile sidebar</SheetDescription>
          <DropdownMenu open modal={false}>
            <DropdownMenuTrigger>Account</DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>Logout</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SheetContent>
      </Sheet>
    )

    expect(document.body.style.pointerEvents).toBe('none')
    expect(screen.getByRole('menu').style.pointerEvents).toBe('auto')
  })
})
