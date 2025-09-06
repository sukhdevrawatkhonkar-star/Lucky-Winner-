import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Gem, Home } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-royalBlue flex flex-col items-center justify-center p-4 text-center">
      <div className="bg-darkCard border border-gold/30 rounded-2xl shadow-lg shadow-gold/10 p-8 w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <Gem className="text-gold h-16 w-16 mb-4 animate-pulse" />
          <h1 className="text-6xl font-cinzel font-bold text-white">404</h1>
          <h2 className="text-2xl font-semibold text-lightGray mt-2">Page Not Found</h2>
          <p className="text-lightGray mt-4">
            Sorry, the page you are looking for does not exist or has been moved.
          </p>
        </div>
        <Button asChild>
          <Link href="/" className="flex items-center justify-center gap-2">
            <Home className="h-4 w-4" /> Go to Homepage
          </Link>
        </Button>
      </div>
    </div>
  )
}
