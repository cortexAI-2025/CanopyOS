import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'CanopyOS — Smart Grow Management',
  description: 'Professional grow management platform for precision cultivation.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-gray-950 text-gray-100 antialiased">
        {children}
      </body>
    </html>
  )
}
