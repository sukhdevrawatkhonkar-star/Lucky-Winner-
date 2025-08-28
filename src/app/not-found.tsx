
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Gem } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-royalBlue flex flex-col items-center justify-center p-4 text-center">
      <div className="bg-darkCard border border-gold/30 rounded-2xl shadow-lg shadow-gold/10 p-8 w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <Gem className="text-gold h-16 w-16 mb-6 animate-pulse" />
          <h1 className="text-6xl font-cinzel font-bold text-white mb-2">404</h1>
          <h2 className="text-2xl font-cinzel text-lightGray mb-6">Page Not Found</h2>
          <p className="text-lightGray mb-8">
            Oops! The page you are looking for does not exist. It might have been moved or deleted.
          </p>
          <Button asChild className="bg-gold text-royalBlue font-bold px-6 py-3 rounded-full hover:bg-transparent hover:border hover:border-gold hover:text-gold transition transform hover:scale-105">
            <Link href="/">Go Back to Home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
