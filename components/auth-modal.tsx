'use client'

import Link from 'next/link'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { IconLogo } from '@/components/ui/icons'

interface AuthModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AuthModal({ open, onOpenChange }: AuthModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="items-center text-center">
          <div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-full bg-muted">
            <IconLogo className="size-14" />
          </div>
          <DialogTitle className="text-xl font-semibold">
            Continue with Sera
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Sign in with your Google account to continue.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-6 flex flex-col items-center gap-3">
          <Button asChild className="w-full" size="lg">
            <Link href="/auth/login">Sign In with Google</Link>
          </Button>
          <p className="text-xs text-muted-foreground">
            Are you a mentor?{' '}
            <Link
              href="/auth/mentor"
              className="underline underline-offset-4 hover:text-foreground"
            >
              Mentor login
            </Link>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
