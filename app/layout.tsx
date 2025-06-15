import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'collaberation doc',
  description: 'dedicated to me, I and myself'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
