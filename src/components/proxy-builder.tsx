"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Search, Loader2, Printer, X, Image as ImageIcon, ListPlus, Globe, Paintbrush, Ghost, Sparkles, RefreshCw, HelpCircle, MessageSquare } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { searchCards, fetchCardInLanguage, fetchAllPrints, fetchPrintsInLanguage, fetchCardByName, ScryfallCard } from "@/lib/scryfall"
import { jsPDF } from "jspdf"
import { toPng } from "html-to-image"
import { EnhancedProxy } from "@/components/enhanced-proxy"
import { useTranslation } from "react-i18next"

const LANGUAGES = [
  { code: "en", name: "English 🇺🇸" },
  { code: "fr", name: "Français 🇫🇷" },
  { code: "es", name: "Español 🇪🇸" },
  { code: "de", name: "Deutsch 🇩🇪" },
  { code: "it", name: "Italiano 🇮🇹" },
  { code: "pt", name: "Português 🇵🇹" },
  { code: "ja", name: "日本語 🇯🇵" },
  { code: "ko", name: "한국어 🇰🇷" },
  { code: "zhs", name: "中文 🇨🇳" },
]

export default function ProxyBuilder() {
  const { t, i18n } = useTranslation()
  const [query, setQuery] = useState("")
  const [searchLangState, setSearchLangState] = useState(i18n.language?.split('-')[0] || "en")
  const [results, setResults] = useState<ScryfallCard[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedCards, setSelectedCards] = useState<(ScryfallCard & { targetLang: string; isEnhanced?: boolean; faceIndex?: number })[]>([])
  const [isExporting, setIsExporting] = useState(false)
  
  useEffect(() => {
    // Optionally remove the localstorage override to prioritize page language
  }, [])

  const setSearchLang = (lang: string) => {
    setSearchLangState(lang)
    localStorage.setItem('searchLang', lang)
  }
  
  const [bulkInput, setBulkInput] = useState("")
  const [bulkImportLang, setBulkImportLang] = useState(i18n.language?.split('-')[0] || "en")
  const [isBulkImporting, setIsBulkImporting] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isUpdatingAll, setIsUpdatingAll] = useState(false)
  
  const [isAddingTokens, setIsAddingTokens] = useState(false)

  // Edition Modal State
  const [isEditionModalOpen, setIsEditionModalOpen] = useState(false)
  const [editionModalCardIndex, setEditionModalCardIndex] = useState<number | null>(null)
  const [editionModalPrints, setEditionModalPrints] = useState<ScryfallCard[]>([])
  const [editionModalPrintsInLang, setEditionModalPrintsInLang] = useState<Set<string>>(new Set())
  const [isFetchingEditions, setIsFetchingEditions] = useState(false)

  // Guide Modal State
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false)

  // Feedback Modal State
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false)
  const [feedbackStatus, setFeedbackStatus] = useState<"idle" | "submitting" | "success" | "error">("idle")

  const searchTimeout = useRef<NodeJS.Timeout | null>(null)
  const isInitialMount = useRef(true)

  // Local Storage Load
  useEffect(() => {
    const saved = localStorage.getItem("mtgProxyStudioCards")
    if (saved) {
      try {
        setSelectedCards(JSON.parse(saved))
      } catch (e) {
        console.error("Failed to load saved cards", e)
      }
    }
  }, [])

  // Local Storage Save
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }
    localStorage.setItem("mtgProxyStudioCards", JSON.stringify(selectedCards))
  }, [selectedCards])

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setQuery(val)
    
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    
    if (val.length < 3) {
      setResults([])
      return
    }

    searchTimeout.current = setTimeout(async () => {
      setIsSearching(true)
      const res = await searchCards(val)
      
      const sorted = res.sort((a, b) => {
        const aName = a.name.toLowerCase()
        const bName = b.name.toLowerCase()
        const q = val.toLowerCase()
        
        const aExact = aName === q
        const bExact = bName === q
        if (aExact && !bExact) return -1
        if (!aExact && bExact) return 1
        
        const aStarts = aName.startsWith(q)
        const bStarts = bName.startsWith(q)
        if (aStarts && !bStarts) return -1
        if (!aStarts && bStarts) return 1
        
        return 0
      })
      
      setResults(sorted.slice(0, 10))
      setIsSearching(false)
    }, 500)
  }

  const addCard = (card: ScryfallCard) => {
    if (!card) return
    const newCard = { ...card, targetLang: searchLangState }
    
    // Check if French version exists right away if French is requested
    if (searchLangState === 'fr' && (!card.printed_name || card.lang !== 'fr')) {
      fetchCardInLanguage(card.set, card.collector_number, 'fr').then((frCard) => {
        setSelectedCards(prev => [...prev, { ...(frCard || card), targetLang: 'fr' }])
      })
      setQuery("")
      setResults([])
      return
    }

    setSelectedCards(prev => [...prev, newCard])
    setQuery("")
    setResults([])
  }

  const handleFeedbackSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setFeedbackStatus("submitting")
    const formData = new FormData(e.currentTarget)
    
    // Remplacer par la clé Web3Forms de l'utilisateur
    formData.append("access_key", "6a6dcaea-1f6d-4e64-9214-72f4bb10c946")
    
    try {
      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        body: formData
      })
      
      if (res.ok) {
        setFeedbackStatus("success")
        setTimeout(() => {
          setIsFeedbackModalOpen(false)
          setFeedbackStatus("idle")
        }, 2500)
      } else {
        setFeedbackStatus("error")
      }
    } catch (err) {
      setFeedbackStatus("error")
    }
  }

  const removeCard = (index: number) => {
    setSelectedCards(prev => prev.filter((_, i) => i !== index))
  }

  const toggleEnhance = (index: number) => {
    setSelectedCards(prev => {
      const newCards = [...prev]
      newCards[index] = {
        ...newCards[index],
        isEnhanced: !newCards[index].isEnhanced
      }
      return newCards
    })
  }

  const updateCardLang = async (index: number, newLang: string) => {
    const card = selectedCards[index]
    const newCardData = await fetchCardInLanguage(card.set, card.collector_number, newLang)
    
    setSelectedCards(prev => {
      const newCards = [...prev]
      newCards[index] = { 
        ...(newCardData || card),
        targetLang: newLang,
        isEnhanced: card.isEnhanced
      }
      return newCards
    })
  }

  const updateAllCardsLang = async (newLang: string) => {
    if (selectedCards.length === 0) return
    setIsUpdatingAll(true)
    
    const updatedCards = await Promise.all(selectedCards.map(async (card) => {
      if (card.layout === 'token') return card // Skip tokens!
      if (card.targetLang === newLang) return card
      const newCardData = await fetchCardInLanguage(card.set, card.collector_number, newLang)
      return {
        ...(newCardData || card),
        targetLang: newLang,
        isEnhanced: card.isEnhanced
      }
    }))
    
    setSelectedCards(updatedCards)
    setIsUpdatingAll(false)
  }

  const [importStats, setImportStats] = useState("")

  const handleBulkImport = async () => {
    if (!bulkInput.trim()) return
    setIsBulkImporting(true)
    setImportStats("")
    
    const lines = bulkInput.split('\n').filter(l => l.trim().length > 0)
    const newCards: (ScryfallCard & { targetLang: string; isEnhanced?: boolean; faceIndex?: number })[] = []
    let successCount = 0
    let failedCount = 0
    let failedNames: string[] = []

    for (const line of lines) {
      const match = line.trim().match(/^(\d+)?\s*(.*)$/)
      if (!match) continue
      
      const qty = match[1] ? parseInt(match[1]) : 1
      let rawName = match[2]
      let setCode: string | undefined = undefined

      // Look for set codes in brackets or parentheses, e.g. [M11] or (ICE)
      const setMatch = rawName.match(/[\(\[\<]([a-zA-Z0-9]{3,5})[\)\]\>]/)
      if (setMatch) {
        setCode = setMatch[1]
        rawName = rawName.substring(0, setMatch.index).trim()
      }
      
      try {
        let card = await fetchCardByName(rawName, setCode)
        if (card) {
          if (bulkImportLang !== "en") {
            const translatedCard = await fetchCardInLanguage(card.set, card.collector_number, bulkImportLang)
            if (translatedCard) card = translatedCard
          }

          for (let i = 0; i < qty; i++) {
            newCards.push({ ...card, targetLang: bulkImportLang, faceIndex: 0 })
          }
          successCount += qty
        } else {
          failedCount += qty
          failedNames.push(rawName)
        }
      } catch (e) {
        console.error("Failed to fetch card:", rawName)
        failedCount += qty
        failedNames.push(rawName)
      }
    }

    setSelectedCards(prev => [...prev, ...newCards])
    setIsBulkImporting(false)
    
    if (failedCount > 0) {
      setImportStats(t('importPartial', { count: failedCount, names: failedNames.join(', ') }))
    } else {
      setImportStats(t('importSuccess', { count: successCount }))
      setTimeout(() => {
        setBulkInput("")
        setIsDialogOpen(false)
        setImportStats("")
      }, 1500)
    }
  }
  
  const handleAddTokens = async () => {
    setIsAddingTokens(true)
    const tokenUris = new Map<string, string>() // uri -> targetLang
    
    for (const card of selectedCards) {
      let parts = card.all_parts;
      
      // Scryfall often omits 'all_parts' for non-English prints.
      // If it's missing, we fetch the English version of the print to find its tokens.
      if (!parts && card.targetLang !== "en") {
        try {
          const res = await fetch(`https://api.scryfall.com/cards/${card.set}/${card.collector_number}/en`);
          if (res.ok) {
            const enCard = await res.json();
            parts = enCard.all_parts;
          }
        } catch (e) {
          console.error("Failed to fetch en version for tokens", e);
        }
      }

      if (parts) {
        for (const part of parts) {
          if (part.component === "token") {
            tokenUris.set(part.uri, card.targetLang)
          }
        }
      }
    }
    
    if (tokenUris.size === 0) {
      setIsAddingTokens(false)
      return
    }

    const newTokens: (ScryfallCard & { targetLang: string })[] = []
    
    for (const [uri, lang] of tokenUris.entries()) {
      try {
        const res = await fetch(uri)
        if (res.ok) {
          let tokenData = await res.json()
          
          if (lang !== "en") {
            const translatedToken = await fetchCardInLanguage(tokenData.set, tokenData.collector_number, lang)
            if (translatedToken) tokenData = translatedToken
          }
          
          newTokens.push({ ...tokenData, targetLang: lang })
        }
      } catch (e) {
        console.error("Failed to fetch token", uri)
      }
    }
    
    setSelectedCards(prev => [...prev, ...newTokens])
    setIsAddingTokens(false)
  }

  const openEditionModal = async (index: number) => {
    const card = selectedCards[index]
    setEditionModalCardIndex(index)
    setIsEditionModalOpen(true)
    setIsFetchingEditions(true)
    setEditionModalPrints([])
    
    if (!card.oracle_id) {
        setIsFetchingEditions(false)
        return
    }

    const [allPrints, langPrints] = await Promise.all([
      fetchAllPrints(card.oracle_id),
      fetchPrintsInLanguage(card.oracle_id, card.targetLang)
    ])
    
    const sortedPrints = [...allPrints].sort((a, b) => {
      const dateA = a.released_at ? new Date(a.released_at).getTime() : 0
      const dateB = b.released_at ? new Date(b.released_at).getTime() : 0
      return dateB - dateA
    })
    
    setEditionModalPrints(sortedPrints)
    setEditionModalPrintsInLang(new Set(langPrints.map(p => `${p.set}-${p.collector_number}`)))
    setIsFetchingEditions(false)
  }

  const selectEdition = async (print: ScryfallCard) => {
    if (editionModalCardIndex === null) return
    
    setIsEditionModalOpen(false)
    const index = editionModalCardIndex
    const card = selectedCards[index]
    
    const newCardData = await fetchCardInLanguage(print.set, print.collector_number, card.targetLang)
    
    setSelectedCards(prev => {
      const newCards = [...prev]
      newCards[index] = { 
        ...(newCardData || print),
        targetLang: card.targetLang,
        isEnhanced: card.isEnhanced,
        faceIndex: card.faceIndex
      }
      return newCards
    })
  }

  const generatePDF = async () => {
    if (selectedCards.length === 0) return
    setIsExporting(true)
    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      })
      
      const cardWidth = 63
      const cardHeight = 88
      const marginX = 10
      const marginY = 10
      const spacing = 2
      
      let x = marginX
      let y = marginY
      let cardsOnPage = 0

      const processImage = async (base64: string) => {
        if (!base64) return
        doc.addImage(base64, 'PNG', x, y, cardWidth, cardHeight)

        // Draw cut lines (crop marks)
        doc.setLineWidth(0.1)
        doc.setDrawColor(150, 150, 150)
        const gap = 0.5 // distance from card corner
        const len = 2 // length of the mark

        // Top Left
        doc.line(x, y - gap, x, y - gap - len)
        doc.line(x - gap, y, x - gap - len, y)
        
        // Top Right
        doc.line(x + cardWidth, y - gap, x + cardWidth, y - gap - len)
        doc.line(x + cardWidth + gap, y, x + cardWidth + gap + len, y)
        
        // Bottom Left
        doc.line(x, y + cardHeight + gap, x, y + cardHeight + gap + len)
        doc.line(x - gap, y + cardHeight, x - gap - len, y + cardHeight)
        
        // Bottom Right
        doc.line(x + cardWidth, y + cardHeight + gap, x + cardWidth, y + cardHeight + gap + len)
        doc.line(x + cardWidth + gap, y + cardHeight, x + cardWidth + gap + len, y + cardHeight)

        cardsOnPage++
        x += cardWidth + spacing

        if (cardsOnPage % 3 === 0) {
          x = marginX
          y += cardHeight + spacing
        }

        if (cardsOnPage === 9) {
          doc.addPage()
          x = marginX
          y = marginY
          cardsOnPage = 0
        }
      }

      for (let i = 0; i < selectedCards.length; i++) {
        const card = selectedCards[i]
        const isDFC = card.card_faces && ['transform', 'modal_dfc', 'reversible_card', 'double_faced_token'].includes(card.layout)

        if (card.isEnhanced) {
          const frontNode = document.getElementById(`enhanced-card-${i}`)
          if (frontNode) {
            const base64 = await toPng(frontNode, { pixelRatio: 4, fetchRequestInit: { cache: 'reload' } })
            await processImage(base64)
          }
          
          if (isDFC) {
            const backNode = document.getElementById(`enhanced-card-back-${i}`)
            if (backNode) {
              const base64 = await toPng(backNode, { pixelRatio: 4, fetchRequestInit: { cache: 'reload' } })
              await processImage(base64)
            }
          }
        } else {
          // Normal card front (or currently selected face)
          // Wait, if we want to print BOTH faces, we should fetch both URLs!
          // We fetch face 0, and then if DFC, face 1.
          const fetchImg = async (fIndex: number) => {
            const imgUrl = card.card_faces?.[fIndex]?.image_uris?.png || card.image_uris?.png
            if (imgUrl) {
              const response = await fetch(imgUrl)
              const blob = await response.blob()
              return await new Promise<string>((resolve) => {
                const reader = new FileReader()
                reader.onloadend = () => resolve(reader.result as string)
                reader.readAsDataURL(blob)
              })
            }
            return ""
          }
          
          const frontBase64 = await fetchImg(0)
          await processImage(frontBase64)
          
          if (isDFC) {
            const backBase64 = await fetchImg(1)
            await processImage(backBase64)
          }
        }
      }

      doc.save("mtg-proxies.pdf")
    } catch (e: any) {
      console.error(e)
      alert(t('exportError') + (e?.message || e?.name || JSON.stringify(e)))
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="container mx-auto p-4 max-w-6xl space-y-8 min-h-screen py-12 relative">
      <div className="absolute top-4 right-4 left-4 z-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center border border-purple-500/30">
            <Sparkles className="w-4 h-4 text-purple-400" />
          </div>
          <span className="font-bold text-lg hidden sm:block">MTG LotusLab Proxies</span>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className="hidden sm:flex rounded-full bg-card/80 backdrop-blur-sm shadow-sm border-white/10" onClick={() => setIsGuideModalOpen(true)}>
            <HelpCircle className="w-4 h-4 mr-2" />
            {t('howItWorks')}
          </Button>
          <Button variant="outline" size="icon" className="sm:hidden rounded-full bg-card/80 backdrop-blur-sm shadow-sm border-white/10" onClick={() => setIsGuideModalOpen(true)}>
            <HelpCircle className="w-4 h-4" />
          </Button>
          
          <Button variant="outline" size="sm" className="hidden sm:flex rounded-full bg-card/80 backdrop-blur-sm shadow-sm border-white/10" onClick={() => setIsFeedbackModalOpen(true)}>
            <MessageSquare className="w-4 h-4 mr-2" />
            Feedback
          </Button>
          <Button variant="outline" size="icon" className="sm:hidden rounded-full bg-card/80 backdrop-blur-sm shadow-sm border-white/10" onClick={() => setIsFeedbackModalOpen(true)}>
            <MessageSquare className="w-4 h-4" />
          </Button>

          <Select value={i18n.language.split('-')[0]} onValueChange={(v) => { if(v) { i18n.changeLanguage(v); window.location.href = `/${v}`; } }}>
            <SelectTrigger className="w-[120px] bg-card/80 backdrop-blur-sm border-white/10 shadow-sm rounded-full h-9">
              <Globe className="h-4 w-4 mr-2 text-muted-foreground shrink-0" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map(l => (
                <SelectItem key={l.code} value={l.code}>{l.name.split(' ')[0]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2 text-center mb-12 mt-12">
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl bg-gradient-to-br from-foreground to-muted-foreground bg-clip-text text-transparent">
          {t('title')}
        </h1>
        <p className="text-muted-foreground text-lg">{t('subtitle')}</p>
      </div>

      <div className="relative max-w-3xl mx-auto z-40 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input 
            placeholder={t('searchPlaceholder')} 
            className="pl-10 h-14 text-lg rounded-2xl shadow-sm bg-card border-muted/50 focus-visible:ring-1"
            value={query}
            onChange={handleSearch}
          />
          {isSearching && (
            <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-muted-foreground" />
          )}

          {results.length > 0 && query.length > 0 && (
            <Card className="absolute top-full mt-2 w-full overflow-hidden shadow-xl border-muted/50">
              <ScrollArea className="h-72">
                <div className="p-2 flex flex-col gap-1">
                  {results.map(card => (
                    <button
                      key={card.id}
                      className="flex items-center gap-3 p-2 rounded-xl hover:bg-muted/50 text-left transition-colors"
                      onClick={() => addCard(card)}
                    >
                      {card.image_uris?.small ? (
                        <img src={card.image_uris.small} alt={card.name} className="h-12 w-8 object-cover rounded-sm" />
                      ) : (
                        <div className="h-12 w-8 bg-muted rounded-sm flex items-center justify-center">
                          <ImageIcon className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        <div className="font-medium">{card.name}</div>
                        <div className="text-xs text-muted-foreground uppercase">{card.set}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </Card>
          )}
        </div>
        
        <Select value={searchLangState} onValueChange={(v) => v && setSearchLang(v)}>
          <SelectTrigger className="w-[100px] !h-14 rounded-2xl bg-card border-muted/50 shadow-sm shrink-0 text-base">
            <Globe className="h-5 w-5 mr-1 text-muted-foreground shrink-0" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LANGUAGES.map(l => (
              <SelectItem key={l.code} value={l.code}>{l.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="outline" className="h-14 px-6 rounded-2xl shadow-sm border-muted/50" onClick={() => setIsDialogOpen(true)}>
          <ListPlus className="h-5 w-5 mr-2" />
          {t('importList')}
        </Button>
      </div>

      {/* Hidden container for exporting back faces of enhanced cards */}
      <div style={{ position: 'absolute', top: '-9999px', left: '-9999px', pointerEvents: 'none', opacity: 0 }}>
        {selectedCards.map((card, idx) => {
          if (card.isEnhanced && card.card_faces && ['transform', 'modal_dfc', 'reversible_card', 'double_faced_token'].includes(card.layout)) {
            return (
              <div key={`back-render-${idx}`} className="w-[315px] h-[440px]">
                <EnhancedProxy card={{ ...card, faceIndex: 1 }} id={`enhanced-card-back-${idx}`} />
              </div>
            )
          }
          return null
        })}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="p-0 overflow-hidden">
            <DialogHeader className="p-0 overflow-hidden rounded-t-lg relative h-32 mb-4">
              <div className="absolute inset-0 bg-[url('/images/import_spellbook.jpg')] bg-cover bg-center opacity-80 mix-blend-screen"></div>
              <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent"></div>
              <div className="absolute bottom-4 left-6">
                <DialogTitle className="text-2xl font-bold tracking-tight text-white drop-shadow-md">{t('importDecklistTitle')}</DialogTitle>
                <DialogDescription className="text-white/80 drop-shadow-sm mt-1">
                  {t('importDecklistDesc')}
                </DialogDescription>
              </div>
            </DialogHeader>
            <div className="px-6 pb-6 space-y-4">
              <Textarea 
                className="h-48 resize-none" 
                placeholder="4 Brainstorm&#10;1 Jace, the Mind Sculptor&#10;Force of Will" 
                value={bulkInput}
                onChange={e => setBulkInput(e.target.value)}
              />
              
              {importStats && (
                <div className={`text-sm font-medium p-3 rounded-lg ${importStats.includes('introuvables') ? 'bg-orange-500/10 text-orange-500' : 'bg-green-500/10 text-green-500'}`}>
                  {importStats}
                </div>
              )}

              <div className="flex items-center gap-4">
                <Select value={bulkImportLang} onValueChange={(v) => v && setBulkImportLang(v)}>
                  <SelectTrigger className="w-1/2">
                    <SelectValue placeholder={t('language')} />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map(l => (
                      <SelectItem key={l.code} value={l.code}>{l.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button 
                  onClick={handleBulkImport} 
                  className="w-1/2" 
                  disabled={isBulkImporting || !bulkInput.trim()}
                >
                  {isBulkImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {isBulkImporting ? t('importingBtn') : t('importBtn')}
                </Button>
              </div>
            </div>
        </DialogContent>
      </Dialog>

      {selectedCards.length === 0 ? (
        <div className="flex flex-col items-center justify-center pt-24 pb-12 opacity-90">
          <div className="relative">
            <div className="absolute inset-0 bg-purple-500/20 blur-2xl rounded-full"></div>
            <img 
              src="/images/hero_lotus.jpg" 
              alt="Mystical Lotus" 
              className="relative w-48 h-48 md:w-64 md:h-64 object-cover rounded-full border border-purple-500/30 shadow-2xl mb-8 mask-image-radial z-10" 
              style={{ WebkitMaskImage: 'radial-gradient(circle, black 50%, transparent 80%)' }} 
            />
          </div>
          <h3 className="text-xl md:text-2xl font-medium text-white/90 mb-2">{t('emptyStateTitle')}</h3>
          <p className="text-sm md:text-base text-muted-foreground max-w-md text-center leading-relaxed">
            {t('emptyStateDesc')}
          </p>
        </div>
      ) : (
        <div className="space-y-6 pt-12">
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            <h2 className="text-2xl font-semibold tracking-tight">{t('yourProxies')} ({selectedCards.length})</h2>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 border-r border-muted/50 pr-4">
                {isUpdatingAll ? (
                  <Button variant="outline" disabled className="shadow-sm">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('updating')}
                  </Button>
                ) : (
                  <Select onValueChange={(v: string | null) => v && updateAllCardsLang(v)}>
                    <SelectTrigger className="w-[220px] shadow-sm">
                      <Globe className="h-4 w-4 mr-2 text-muted-foreground shrink-0" />
                      <SelectValue placeholder={t('setLangAll')} />
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGES.map(l => (
                        <SelectItem key={l.code} value={l.code}>{l.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <Button 
                variant="outline"
                onClick={handleAddTokens}
                disabled={isAddingTokens}
                className="shadow-sm border-dashed"
              >
                {isAddingTokens ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Ghost className="mr-2 h-4 w-4" />}
                {t('addTokens')}
              </Button>
              <Button 
                variant="outline"
                onClick={() => setSelectedCards([])}
                className="shadow-sm"
              >
                {t('clearAll')}
              </Button>
              <Button 
                onClick={generatePDF} 
                disabled={isExporting}
                className="shadow-sm"
              >
                {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}
                {isExporting ? t('generatingPdf') : t('exportPdf')}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            <AnimatePresence>
              {selectedCards.map((card, idx) => (
                <motion.div
                  key={`${card.id}-${idx}`}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9, filter: "blur(4px)" }}
                  className="group relative rounded-2xl bg-card border border-muted/50 shadow-sm overflow-hidden flex flex-col"
                >
                  <div className="relative aspect-[63/88] w-full bg-muted rounded-t-2xl overflow-hidden">
                    {card.isEnhanced ? (
                      <EnhancedProxy card={card} id={`enhanced-card-${idx}`} />
                    ) : (
                      (() => {
                        const fIndex = card.faceIndex || 0
                        const imgUrl = card.image_uris?.png || card.image_uris?.large || card.card_faces?.[fIndex]?.image_uris?.png
                        return imgUrl ? (
                          <img 
                            src={imgUrl} 
                            alt={card.name} 
                            className="object-cover w-full h-full contrast-[1.05] saturate-[1.05]"
                            crossOrigin="anonymous"
                          />
                        ) : (
                          <div className="flex items-center justify-center w-full h-full text-muted-foreground p-4 text-center text-xs">
                            Image non disponible
                          </div>
                        )
                      })()
                    )}
                    
                    <div className="absolute top-2 right-2 flex flex-col gap-2 z-20">
                      <button
                        onClick={() => removeCard(idx)}
                        className="p-1.5 bg-black/50 hover:bg-black/80 text-white rounded-full backdrop-blur-sm transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100"
                        title={t('removeCard')}
                      >
                        <X className="w-4 h-4" />
                      </button>
                      
                      {card.card_faces && ['transform', 'modal_dfc', 'reversible_card', 'double_faced_token'].includes(card.layout) && (
                        <button
                          onClick={() => {
                            setSelectedCards(prev => prev.map((c, i) => 
                              i === idx ? { ...c, faceIndex: c.faceIndex === 1 ? 0 : 1 } : c
                            ))
                          }}
                          className="p-1.5 bg-blue-500/80 hover:bg-blue-600 text-white rounded-full backdrop-blur-sm transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100"
                          title={t('flipCard')}
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      )}
                      
                      {card.layout !== 'token' && card.layout !== 'saga' && !card.type_line?.includes('Saga') && (
                        <button 
                          onClick={() => toggleEnhance(idx)}
                          className={`p-1.5 rounded-full opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all backdrop-blur-sm shadow ${card.isEnhanced ? 'bg-amber-500 text-white hover:bg-amber-600' : 'bg-black/50 text-white hover:bg-black/70'}`}
                        >
                          <Sparkles className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    
                    <button
                      onClick={() => openEditionModal(idx)}
                      className="absolute bottom-2 left-2 right-2 py-1.5 px-3 bg-black/70 hover:bg-black/90 text-white text-xs font-medium rounded-lg opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all backdrop-blur-sm flex items-center justify-center gap-2 z-20"
                    >
                      <Paintbrush className="h-3 w-3" />
                      {t('changeEdition')}
                    </button>
                  </div>
                  
                  <div className="p-4 space-y-3 bg-card border-t border-muted">
                    <div className="flex flex-col gap-0.5">
                      {(() => {
                        const fIndex = card.faceIndex || 0
                        const cName = card.card_faces?.[fIndex]?.name || card.name
                        const pName = card.card_faces?.[fIndex]?.printed_name || card.printed_name || cName
                        return (
                          <>
                            <div className="flex items-center justify-between gap-2">
                              <div className="font-medium truncate flex items-center gap-1.5" title={`${pName} (${card.set.toUpperCase()})`}>
                                <span className="truncate">{pName}</span>
                                <span className="text-[10px] text-muted-foreground font-semibold uppercase bg-muted px-1.5 py-0.5 rounded-md shrink-0">
                                  {card.set}
                                </span>
                              </div>
                              {card.isEnhanced && (
                                <div className="bg-amber-500 text-white text-[10px] uppercase font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm shrink-0">
                                  <Sparkles className="h-3 w-3" />
                                  {t('enhanced')}
                                </div>
                              )}
                            </div>
                            {pName !== cName && (
                              <div className="text-xs text-muted-foreground italic truncate" title={cName}>
                                ({cName})
                              </div>
                            )}
                          </>
                        )
                      })()}
                    </div>
                    <div className="flex gap-2">
                      {card.layout === 'token' ? (
                        <div className="w-full h-8 text-xs flex items-center px-3 border border-muted/50 rounded-md bg-muted/30 text-muted-foreground cursor-not-allowed">
                          English 🇺🇸
                        </div>
                      ) : (
                        <Select value={card.targetLang} onValueChange={(v) => v && updateCardLang(idx, v)}>
                          <SelectTrigger className="w-full h-8 text-xs">
                            <SelectValue placeholder={t('language')} />
                          </SelectTrigger>
                          <SelectContent>
                            {LANGUAGES.map(l => (
                              <SelectItem key={l.code} value={l.code}>{l.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Edition Selection Modal */}
      <Dialog open={isEditionModalOpen} onOpenChange={setIsEditionModalOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{t('chooseEditionTitle')}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            {isFetchingEditions ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <ScrollArea className="h-[60vh] pr-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-6 py-4">
                  {editionModalPrints.map((print) => {
                    const isAvailableInTargetLang = editionModalPrintsInLang.has(`${print.set}-${print.collector_number}`)
                    
                    return (
                      <button
                        key={print.id}
                        onClick={() => selectEdition(print)}
                        className="group relative flex flex-col items-center gap-2 text-left rounded-xl hover:ring-2 ring-primary transition-all"
                      >
                        <div className="relative aspect-[63/88] w-full bg-muted rounded-lg overflow-hidden shadow-sm">
                          {(print.image_uris?.normal || print.card_faces?.[0]?.image_uris?.normal) ? (
                            <img 
                              src={print.image_uris?.normal || print.card_faces?.[0]?.image_uris?.normal} 
                              alt={print.name} 
                              className="object-cover w-full h-full"
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full w-full">
                              <ImageIcon className="h-8 w-8 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="w-full text-xs text-center space-y-0.5">
                          <div className="font-medium uppercase">{print.set} <span className="text-muted-foreground">#{print.collector_number}</span></div>
                          {!isAvailableInTargetLang && editionModalCardIndex !== null && (
                            <div className="text-orange-500 font-semibold">(en)</div>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </ScrollArea>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Guide Modal */}
      <Dialog open={isGuideModalOpen} onOpenChange={setIsGuideModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">{t('howItWorks')}</DialogTitle>
            <DialogDescription>
              {t('guideSubtitle')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="grid gap-2">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Search className="w-5 h-5 text-purple-400" />
                1. {t('guideStep1Title')}
              </h3>
              <p className="text-muted-foreground text-sm pl-7">{t('guideStep1Desc')}</p>
            </div>
            <div className="grid gap-2">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <ListPlus className="w-5 h-5 text-purple-400" />
                2. {t('guideStep2Title')}
              </h3>
              <p className="text-muted-foreground text-sm pl-7">{t('guideStep2Desc')}</p>
            </div>
            <div className="grid gap-2">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Paintbrush className="w-5 h-5 text-purple-400" />
                3. {t('guideStep3Title')}
              </h3>
              <p className="text-muted-foreground text-sm pl-7">{t('guideStep3Desc')}</p>
            </div>
            <div className="grid gap-2">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-purple-400" />
                4. {t('guideStep4Title')}
              </h3>
              <p className="text-muted-foreground text-sm pl-7">{t('guideStep4Desc')}</p>
            </div>
            <div className="grid gap-2">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Printer className="w-5 h-5 text-purple-400" />
                5. {t('guideStep5Title')}
              </h3>
              <p className="text-muted-foreground text-sm pl-7">{t('guideStep5Desc')}</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Feedback Modal */}
      <Dialog open={isFeedbackModalOpen} onOpenChange={setIsFeedbackModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Feedback</DialogTitle>
            <DialogDescription>
              Une suggestion ? Un bug ? Envoyez-moi un message directement !
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleFeedbackSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">Votre Email (Optionnel)</label>
              <Input type="email" name="email" id="email" placeholder="pour vous répondre..." className="bg-card" />
            </div>
            <div className="space-y-2">
              <label htmlFor="message" className="text-sm font-medium">Votre Message</label>
              <Textarea name="message" id="message" required placeholder="J'adore ce site, mais j'aimerais bien..." className="min-h-[100px] bg-card" />
            </div>
            
            {/* Honeypot Spam Protection */}
            <input type="checkbox" name="botcheck" className="hidden" style={{ display: 'none' }} />

            <div className="pt-2">
              <Button type="submit" className="w-full" disabled={feedbackStatus === 'submitting' || feedbackStatus === 'success'}>
                {feedbackStatus === 'idle' || feedbackStatus === 'error' ? 'Envoyer' : ''}
                {feedbackStatus === 'submitting' ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : ''}
                {feedbackStatus === 'submitting' ? 'Envoi en cours...' : ''}
                {feedbackStatus === 'success' ? 'Message Envoyé ! Merci ❤️' : ''}
              </Button>
              {feedbackStatus === 'error' && (
                <p className="text-red-500 text-sm mt-2 text-center">Erreur lors de l'envoi. Vérifiez votre clé API.</p>
              )}
            </div>
          </form>
        </DialogContent>
      </Dialog>
      {/* SEO Footer */}
      <footer className="mt-24 pt-8 border-t border-white/10 pb-8 text-center text-sm text-muted-foreground/60 max-w-4xl mx-auto space-y-4">
        <p>
          MTG LotusLab Proxies is a 100% <strong>free (gratuit) Magic: The Gathering proxy generator</strong>. Easily create premium playtest proxies with borderless aesthetics and perfect readability in any language (English, Français, Español, Deutsch, Italiano, Português, 日本語). Supports bulk decklist import (e.g. from Moxfield or EDHREC), all MTG sets, and double-faced cards (MDFC).
        </p>
        <p>
          Whether you need to print a Commander deck, test new cards, or create high-quality <strong>MTG proxies</strong> for your cube, LotusLab provides crystal clear Scryfall image generation and optimized A4 PDF exports ready for printing and cutting.
        </p>
        <p className="text-xs mt-8">
          This site is unaffiliated with Wizards of the Coast. Magic: The Gathering and its art are the property of Wizards of the Coast LLC.
        </p>
      </footer>
    </div>
  )
}
