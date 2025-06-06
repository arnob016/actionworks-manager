"use client"

import type React from "react"
import { useEffect } from "react"
import { useUserPreferencesStore } from "@/lib/store"
import { Toaster } from "sonner"
import { Inter, Roboto, Source_Code_Pro, Lato, Open_Sans } from "next/font/google"
import { cn } from "@/lib/utils"

// Font definitions
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })
const roboto = Roboto({ weight: ["400", "700"], subsets: ["latin"], variable: "--font-roboto" })
const sourceCodePro = Source_Code_Pro({ subsets: ["latin"], variable: "--font-source-code-pro" })
const lato = Lato({ weight: ["400", "700"], subsets: ["latin"], variable: "--font-lato" })
const openSans = Open_Sans({ subsets: ["latin"], variable: "--font-open-sans" })

const fontMapping = {
  inter: inter.className,
  roboto: roboto.className,
  "source-code-pro": sourceCodePro.className,
  lato: lato.className,
  "open-sans": openSans.className,
}

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const { preferences } = useUserPreferencesStore()

  useEffect(() => {
    const root = window.document.documentElement

    // Handle Dark Mode
    root.classList.toggle("dark", preferences.darkMode)

    // Handle Font Family
    // Remove all possible font classes before adding the new one
    Object.values(fontMapping).forEach((fontClass) => {
      root.classList.remove(fontClass)
    })
    const fontClass = fontMapping[preferences.font] || inter.className
    root.classList.add(fontClass)

    // Handle Font Size and Line Height
    root.style.fontSize = `${preferences.fontSize}px`
    root.style.lineHeight = String(preferences.lineHeight)
  }, [preferences])

  return (
    <div
      className={cn(
        "min-h-screen bg-background font-sans text-foreground",
        inter.variable,
        roboto.variable,
        sourceCodePro.variable,
        lato.variable,
        openSans.variable,
      )}
    >
      {children}
      <Toaster position="bottom-right" theme={preferences.darkMode ? "dark" : "light"} />
    </div>
  )
}
