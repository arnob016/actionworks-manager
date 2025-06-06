import type React from "react"
import type { Metadata } from "next"
import ClientLayout from "./clientLayout" // This is the client component wrapper
import "./globals.css" // Ensure globals are imported here

export const metadata: Metadata = {
  title: "Action",
  description: "A dynamic and modular project and task management web app.",
  icons: {
    icon: "/action-logo.png",
  },
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      {/* 
      The <body> tag is rendered here by the Server Component.
      ClientLayout, as a child, will use useEffect to manipulate 
      document.documentElement and document.body classes/styles for dynamic theming.
    */}
      <body>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  )
}
