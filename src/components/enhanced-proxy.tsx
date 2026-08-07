import React, { useEffect, useState, useRef } from "react"
import { ScryfallCard } from "@/lib/scryfall"
import { fetchCardInLanguage } from "@/lib/scryfall"
import { Loader2 } from "lucide-react"

const TextFitter = ({ children, maxFontSize, minFontSize = 8, isMultiline = false, className, style, onMeasure }: any) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [fontSize, setFontSize] = useState(maxFontSize)

  // Reset font size when content changes
  useEffect(() => {
    setFontSize(maxFontSize)
  }, [children, maxFontSize])

  // Recursively shrink font size until it fits or hits minimum
  useEffect(() => {
    const container = containerRef.current
    const content = contentRef.current
    if (!container || !content) return

    const checkFit = () => {
      const isOverflowing = isMultiline 
        ? content.scrollHeight > container.clientHeight
        : content.scrollWidth > container.clientWidth

      if (isOverflowing && fontSize > minFontSize) {
        setFontSize((prev: number) => Math.max(prev - 0.5, minFontSize))
      } else if (!isOverflowing || fontSize === minFontSize) {
        if (onMeasure) {
          // If not multiline, report the width ratio so the mask can shrink to fit.
          // Add a tiny buffer (like 1%) for safety.
          if (!isMultiline && container.clientWidth > 0) {
            const ratio = content.scrollWidth / container.clientWidth
            onMeasure(ratio)
          }
        }
      }
    }
    
    const raf = requestAnimationFrame(checkFit)
    return () => cancelAnimationFrame(raf)
  }, [fontSize, children, minFontSize, isMultiline, onMeasure])

  return (
    <div ref={containerRef} className={`w-full h-full flex ${isMultiline ? 'flex-col' : 'items-center'} overflow-hidden`}>
      <div 
        ref={contentRef} 
        className={className} 
        style={{ ...style, fontSize: `${fontSize}px` }}
      >
        {children}
      </div>
    </div>
  )
}

const renderManaSymbol = (symbol: string, index: number) => {
  const s = symbol.replace(/[{}]/g, '')
  
  return (
    <img 
      key={index}
      src={`https://svgs.scryfall.io/card-symbols/${s}.svg?v=1`}
      alt={symbol}
      className="inline-block mx-[1px]"
      style={{ width: '0.95em', height: '0.95em', verticalAlign: 'middle', marginTop: '-0.1em' }}
      crossOrigin="anonymous"
    />
  )
}

const renderTextWithSymbols = (text: string) => {
  if (!text) return null
  
  // Fix typos in Scryfall's database (e.g., TMC 59 FR has {CC} instead of {C}{C})
  let fixedText = text.replace(/\{CC\}/g, '{C}{C}')
  
  const parts = fixedText.split(/(\{.*?\})/)
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('{') && part.endsWith('}')) {
          return renderManaSymbol(part, i)
        }
        return <span key={i}>{part}</span>
      })}
    </>
  )
}

const BlurredMask = ({ top, left, width, height, bgImage, tint, debug, radius = '2px', clipPath, filter = 'blur(10px) brightness(0.6)', children }: any) => {
  const bgWidth = 100 / (width / 100)
  const bgHeight = 100 / (height / 100)
  const bgLeft = - (left / width) * 100
  const bgTop = - (top / height) * 100

  return (
    <div 
      className={`absolute z-10 overflow-hidden ${debug ? 'border-[1.5px] border-red-500' : ''}`}
      style={{ top: `${top}%`, left: `${left}%`, width: `${width}%`, height: `${height}%`, borderRadius: radius, clipPath: clipPath }}
    >
      <div 
        className="absolute w-full h-full"
        style={{
          width: `${bgWidth}%`,
          height: `${bgHeight}%`,
          left: `${bgLeft}%`,
          top: `${bgTop}%`,
          filter: filter,
          WebkitFilter: filter
        }}
      >
        <img 
          src={bgImage} 
          alt="mask-bg" 
          crossOrigin="anonymous" 
          className="absolute inset-0 w-full h-full object-fill" 
        />
      </div>
      {tint && (
        <div 
          className={`absolute inset-0 z-10 ${tint}`} 
        />
      )}
      <div className="absolute inset-0 z-20 flex flex-col justify-center px-1">
        {children}
      </div>
    </div>
  )
}

const typeTranslations: Record<string, string> = {
  "Legendary Creature": "Créature légendaire",
  "Legendary Artifact": "Artefact légendaire",
  "Legendary Enchantment": "Enchantement légendaire",
  "Legendary Planeswalker": "Planeswalker légendaire",
  "Legendary Land": "Terrain légendaire",
  "Basic Land": "Terrain de base",
  "Snow Creature": "Créature neigeuse",
  "Snow Land": "Terrain neigeux",
  "Creature": "Créature",
  "Artifact": "Artefact",
  "Enchantment": "Enchantement",
  "Land": "Terrain",
  "Instant": "Éphémère",
  "Sorcery": "Rituel",
  "Tribal": "Tribal",
  "Planeswalker": "Planeswalker",
  "Equipment": "Équipement",
  "Aura": "Aura",
  "Vehicle": "Véhicule",
  "Human": "humain",
  "Hero": "héros",
  "Spider": "araignée",
  "Symbiote": "symbiote",
  "Island": "île",
  "Plains": "plaine",
  "Mountain": "montagne",
  "Swamp": "marais",
  "Forest": "forêt"
};

const translateTypeLine = (typeLine: string) => {
  if (!typeLine) return "";
  let translated = typeLine;
  // Handle compound types first, then single words
  Object.entries(typeTranslations).forEach(([eng, fr]) => {
    const regex = new RegExp(`\\b${eng}\\b`, 'g');
    translated = translated.replace(regex, fr);
  });
  return translated;
};

export const EnhancedProxy = React.forwardRef<HTMLDivElement, { card: ScryfallCard & { faceIndex?: number }, id?: string }>(({ card, id }, ref) => {
  const [enCard, setEnCard] = useState<ScryfallCard | null>(null)
  
  useEffect(() => {
    let mounted = true
    if (card.targetLang === "en" || !card.lang || card.lang === "en") return
    
    const fetchEn = async () => {
      const res = await fetchCardInLanguage(card.set, card.collector_number, "en")
      if (mounted && res) {
        setEnCard(res)
      }
    }
    fetchEn()
    return () => { mounted = false }
  }, [card.set, card.collector_number])

  const baseCard = enCard || card
  const fIndex = card.faceIndex || 0
  const isFace = card.card_faces && card.card_faces.length > fIndex
  const bgImage = isFace ? baseCard.card_faces![fIndex].image_uris?.normal : baseCard.image_uris?.normal
  const name = isFace ? (card.card_faces![fIndex].printed_name || card.card_faces![fIndex].name) : (card.printed_name || card.name)
  
  const rawTypeLine = isFace ? (card.card_faces![fIndex].printed_type_line || card.card_faces![fIndex].type_line) : (card.printed_type_line || card.type_line || "")
  // If the target lang is French, but the API couldn't find a French type line (which happens often on Scryfall), translate it manually.
  const isFrench = card.lang === 'fr' || (card as any).targetLang === 'fr'
  const typeLine = isFrench ? translateTypeLine(rawTypeLine) : rawTypeLine

  const text = isFace ? (card.card_faces![fIndex].printed_text || card.card_faces![fIndex].oracle_text) : (card.printed_text || card.oracle_text || "")
  const flavor = isFace ? (card.card_faces![fIndex].printed_flavor_text || card.card_faces![fIndex].flavor_text) : (card.printed_flavor_text || card.flavor_text || "")
  const hasPT = isFace ? !!card.card_faces![fIndex].power : !!card.power
  
  const colors = isFace ? card.card_faces![fIndex].colors : card.colors
  const colorIdentity = card.color_identity || []
  
  // A frame is dark/black if it's a mono-black card OR if it's a colorless land with a black identity (e.g. Swamp)
  // Frame detection
  const frameYear = baseCard.frame || "2015"
  const isClassicFrame = frameYear === "1993" || frameYear === "1997"

  // Dark frame detection for Classic frames ONLY (modern cards forced to grey/black text)
  const isMonoBlack = colors?.length === 1 && colors[0] === 'B'
  const isBlackLand = (!colors || colors.length === 0) && colorIdentity.length === 1 && colorIdentity[0] === 'B' && (typeLine.toLowerCase().includes('land') || typeLine.toLowerCase().includes('terrain'))
  
  // As requested, modern black cards get grey mask / black text. Classic frames have white text on their dark background.
  const isBlackFrame = isClassicFrame ? (isMonoBlack || isBlackLand) : false

  // Modern defaults
  let titleTint = "bg-white/30"
  let titleColor = "#000"
  let maskFilter = "blur(6px) brightness(1.25)"
  let rulesTint = "bg-white/70"
  let titleShadow = "drop-shadow-[0_1px_1px_rgba(255,255,255,0.5)]"

  // Classic overrides
  if (isClassicFrame) {
    // In classic, text is white, and there's no solid title bar box.
    // To match the card background, we use zero tint and slightly boost brightness to counter the blurred black English text.
    titleTint = "bg-transparent"
    titleColor = "#fff"
    maskFilter = "blur(6px) brightness(1.15) contrast(1.05)" 
    // Parchment box for rules is colored based on the card in classic frames
    if (colors?.length === 1) {
      if (colors[0] === 'W') rulesTint = "bg-[#f2ece4]/90" // Cream/White
      else if (colors[0] === 'U') rulesTint = "bg-[#a6cadd]/90" // Pale blue
      else if (colors[0] === 'R') rulesTint = "bg-[#e5a895]/90" // Pale red
      else rulesTint = "bg-[#d4c3a3]/85"
    } else {
      rulesTint = "bg-[#d4c3a3]/85" // Gold/Artifact/Colorless/Green fallback
    }
    
    titleShadow = "drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]"
  } else if (isMonoBlack || isBlackLand) {
    // Modern black cards have black text, but the user requested NO shadow for these specific cards.
    titleShadow = ""
  } else if (isBlackFrame) {
    // Fallback if we ever want dark modern frames again
    titleTint = "bg-black/40"
    titleColor = "#fff"
    maskFilter = "blur(6px) brightness(0.4)"
    titleShadow = "drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]"
  }

  // Dynamic Title Mask Width calculation
  const manaCostStr = isFace ? (card.card_faces![fIndex].mana_cost || "") : (card.mana_cost || "")
  const manaSymbolsCount = (manaCostStr.match(/\{/g) || []).length
  
  // Classic mana symbols are pushed further left
  const manaOffset = isClassicFrame ? 6.5 : 5.0
  const titleRightBoundary = 87 - (manaSymbolsCount * manaOffset)
  const titleMaskLeft = 6.0
  const dynamicTitleWidth = titleRightBoundary - titleMaskLeft

  // Layout Coordinates
  const isIceSet = baseCard.set?.toLowerCase() === 'ice'
  const topTitle = isClassicFrame ? (isIceSet ? 3.4 : 4.9) : 4.9
  const topType = isClassicFrame ? 55.7 : 56.5
  const heightType = isClassicFrame ? 3.75 : 5.1
  const topRules = isClassicFrame ? 60.0 : 63.0
  const heightRules = isClassicFrame ? 28.0 : 29.3
  const rulesLeft = isClassicFrame ? 11.4 : 7.3
  const rulesWidth = isClassicFrame ? 77.2 : 85.0
  const heightTitle = isClassicFrame ? 4.8 : 5.1
  const rulesPadding = isClassicFrame ? "px-2.5 py-1.5" : "p-1"

  // Clip path to reveal Power/Toughness box for creatures. 
  // Classic frames don't use this, they have a straight rectangle!
  const rulesClipPath = (hasPT && !isClassicFrame)
    ? "polygon(0 0, 100% 0, 100% 89%, 83% 89%, 83% 100%, 0 100%)" 
    : undefined

  const textPaddingClass = isClassicFrame ? "pl-[5pt]" : "pl-[1pt]"

  return (
    <div 
      ref={ref}
      id={id}
      className="relative w-full h-full rounded-lg overflow-hidden bg-black select-none proxy-card-container"
    >
      {!enCard && card.targetLang !== 'en' && card.lang && card.lang !== 'en' && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted z-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}
      
      {bgImage && (
        <img 
          src={bgImage} 
          alt={name} 
          className="absolute inset-0 w-full h-full object-cover z-0" 
          crossOrigin="anonymous" 
        />
      )}
      
      {/* Title Mask (Finished) */}
      <BlurredMask top={topTitle} left={titleMaskLeft} width={dynamicTitleWidth} height={heightTitle} bgImage={bgImage} tint={titleTint} filter={maskFilter} radius={isClassicFrame ? "0px" : "6px 0 0 6px"} debug={false}>
        <TextFitter maxFontSize={14} minFontSize={9} className={`flex justify-start items-center text-left ${textPaddingClass} pr-1 whitespace-nowrap tracking-tight w-full h-full ${titleShadow}`} style={{ fontFamily: '"Beleren Bold", serif', color: titleColor }}>
          {name}
        </TextFitter>
      </BlurredMask>

      {/* Type Line Mask (Finished) */}
      <BlurredMask top={topType} left={titleMaskLeft} width={78.5} height={heightType} bgImage={bgImage} tint={titleTint} filter={maskFilter} radius={isClassicFrame ? "0px" : "6px 0 0 6px"} debug={false}>
        <TextFitter maxFontSize={12} minFontSize={9} className={`flex justify-start items-center text-left ${textPaddingClass} pr-1 whitespace-nowrap tracking-tight w-full h-full ${titleShadow}`} style={{ fontFamily: '"Beleren Bold", serif', color: titleColor }}>
          {typeLine}
        </TextFitter>
      </BlurredMask>

      {/* Rules Text Mask (Finished) */}
      <BlurredMask top={topRules} left={rulesLeft} width={rulesWidth} height={heightRules} bgImage={bgImage} tint={rulesTint} filter="blur(2px)" radius="0px" clipPath={rulesClipPath} debug={false}>
        <div className={`w-full h-full flex flex-col ${rulesPadding} overflow-hidden`} style={{ fontFamily: 'var(--font-mplantin), serif' }}>
          <TextFitter maxFontSize={14} minFontSize={8} isMultiline={true} className="leading-[1.1] text-black w-full h-full block">
            {hasPT && (
              <>
                <div style={{ float: 'right', height: '82%', width: '0' }} />
                <div style={{ clear: 'right', float: 'right', height: '18%', width: '22%', shapeOutside: 'margin-box' }} />
              </>
            )}
            <div className="whitespace-pre-wrap">{renderTextWithSymbols(text)}</div>
            {flavor && (
              <div className="whitespace-pre-wrap italic opacity-90 border-t border-black/20 pt-1 mt-1.5">{flavor}</div>
            )}
          </TextFitter>
        </div>
      </BlurredMask>
    </div>
  )
})

EnhancedProxy.displayName = "EnhancedProxy"
