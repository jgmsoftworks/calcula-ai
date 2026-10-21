import * as React from "react"
import * as SelectPrimitive from "@radix-ui/react-select"
import { Check, ChevronDown, ChevronUp, Search } from "lucide-react"

import { cn } from "@/lib/utils"

const SelectOpenContext = React.createContext<{ open: boolean; choose: (value: string) => void }>({ open: false, choose: () => {} })
const SelectSearchContext = React.createContext("")
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR")
function nodeText(node: React.ReactNode): string {
  return React.Children.toArray(node).map(child => {
    if (typeof child === "string" || typeof child === "number") return String(child)
    return React.isValidElement<{ children?: React.ReactNode }>(child) ? nodeText(child.props.children) : ""
  }).join(" ")
}
function optionTexts(children: React.ReactNode): string[] {
  return React.Children.toArray(children).flatMap(child => {
    if (!React.isValidElement<{ value?: string; textValue?: string; children?: React.ReactNode }>(child)) return []
    if (child.type === SelectItem && child.props.value) return [child.props.textValue || nodeText(child.props.children)]
    return optionTexts(child.props.children)
  })
}
function Select({ open: controlledOpen, defaultOpen = false, onOpenChange, value: controlledValue, defaultValue = "", onValueChange, ...props }: React.ComponentProps<typeof SelectPrimitive.Root>) {
  const [localOpen, setLocalOpen] = React.useState(defaultOpen)
  const [localValue, setLocalValue] = React.useState(defaultValue)
  const open = controlledOpen ?? localOpen
  const changeOpen = React.useCallback((next: boolean) => {
    setLocalOpen(next)
    onOpenChange?.(next)
  }, [onOpenChange])
  const changeValue = React.useCallback((next: string) => {
    setLocalValue(next)
    onValueChange?.(next)
  }, [onValueChange])
  const state = React.useMemo(() => ({ open, choose: (value: string) => {
    changeValue(value)
    changeOpen(false)
  } }), [open, changeValue, changeOpen])
  return <SelectOpenContext.Provider value={state}>
    <SelectPrimitive.Root {...props} value={controlledValue ?? localValue} onValueChange={changeValue} open={open} onOpenChange={changeOpen} />
  </SelectOpenContext.Provider>
}

const SelectGroup = SelectPrimitive.Group

const SelectValue = SelectPrimitive.Value

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    data-field-control="select"
    className={cn(
      "flex h-[46px] min-w-0 w-full items-center justify-between gap-2 rounded-[11px] border border-input bg-background py-2 pl-3.5 pr-2.5 text-left text-base md:text-sm disabled:cursor-not-allowed disabled:opacity-50 [&>span:first-child]:truncate",
      className
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon className="field-select-arrow">
      <ChevronDown className="h-4 w-4" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
))
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName

const SelectScrollUpButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollUpButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn(
      "flex cursor-default items-center justify-center py-1",
      className
    )}
    {...props}
  >
    <ChevronUp className="h-4 w-4" />
  </SelectPrimitive.ScrollUpButton>
))
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName

const SelectScrollDownButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollDownButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn(
      "flex cursor-default items-center justify-center py-1",
      className
    )}
    {...props}
  >
    <ChevronDown className="h-4 w-4" />
  </SelectPrimitive.ScrollDownButton>
))
SelectScrollDownButton.displayName =
  SelectPrimitive.ScrollDownButton.displayName

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content> & { searchable?: boolean }
>(({ className, children, position = "popper", searchable, sideOffset = 8, ...props }, ref) => {
  const { open, choose } = React.useContext(SelectOpenContext)
  const [query, setQuery] = React.useState("")
  const inputRef = React.useRef<HTMLInputElement>(null)
  const viewportRef = React.useRef<HTMLDivElement>(null)
  const options = React.useMemo(() => optionTexts(children), [children])
  const hasSearch = searchable ?? options.length > 5
  const term = normalize(query.trim())
  const matches = options.filter(text => normalize(text).includes(term)).length

  React.useEffect(() => {
    if (!open) { setQuery(""); return }
    if (!hasSearch) return
    // Wait for Radix's initial selected-item focus before focusing the search.
    const frame = requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }))
    return () => cancelAnimationFrame(frame)
  }, [open, hasSearch])

  return <SelectSearchContext.Provider value={hasSearch ? term : ""}>
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        ref={ref}
        data-select-menu=""
        className={cn(
          "relative z-50 flex max-h-[min(360px,var(--radix-select-content-available-height))] max-w-[calc(100vw-1.5rem)] min-w-[8rem] flex-col overflow-hidden rounded-[15px] border bg-popover p-1.5 text-popover-foreground shadow-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          position === "popper" && "w-[var(--radix-select-trigger-width)]",
          className
        )}
        position={position}
        sideOffset={sideOffset}
        {...props}
      >
        {hasSearch && <div className="field-select-search" onKeyDown={event => {
          // Typing must edit the query instead of activating Select's typeahead.
          if (event.key === "Escape" || event.key === "Tab") return
          event.stopPropagation()
          if (["ArrowDown", "ArrowUp", "Enter"].includes(event.key)) {
            event.preventDefault()
            const visible = Array.from(viewportRef.current?.querySelectorAll<HTMLElement>('[data-select-option]:not([data-disabled]):not([hidden])') || [])
            const target = event.key === "ArrowUp" ? visible.at(-1) : visible[0]
            if (event.key === "Enter" && target?.dataset.selectValue) choose(target.dataset.selectValue)
            else target?.focus()
          }
        }}>
          <Search aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input ref={inputRef} value={query} onChange={event => setQuery(event.target.value)}
            aria-label="Buscar opção" placeholder="Buscar opção…" autoComplete="off" spellCheck={false} />
        </div>}
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport ref={viewportRef} className="min-h-0 w-full flex-1 p-0.5">
          {children}
        </SelectPrimitive.Viewport>
        {hasSearch && matches === 0 && <p role="status" className="px-3 py-5 text-center text-sm text-muted-foreground">Nenhuma opção encontrada.</p>}
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  </SelectSearchContext.Provider>
})
SelectContent.displayName = SelectPrimitive.Content.displayName

const SelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn("py-1.5 pl-8 pr-2 text-sm font-semibold", className)}
    {...props}
  />
))
SelectLabel.displayName = SelectPrimitive.Label.displayName

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, value, textValue, disabled, ...props }, ref) => {
  const term = React.useContext(SelectSearchContext)
  const filtered = !!term && !normalize(textValue || nodeText(children)).includes(term)
  // Defensive check to prevent empty string values
  if (!value || value === '') {
    // Log warning but don't pollute console in production
    if (process.env.NODE_ENV === 'development') {
      console.warn('SelectItem received empty value, skipping render');
    }
    return null;
  }
  
  return (
    <SelectPrimitive.Item
      ref={ref}
      value={value}
      textValue={textValue}
      disabled={disabled || filtered}
      hidden={filtered}
      data-select-option=""
      data-select-value={value}
      className={cn(
        "relative flex min-h-11 w-full cursor-pointer select-none items-center rounded-lg py-2.5 pl-3 pr-10 text-sm outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className
      )}
      {...props}
    >
      <span className="absolute right-2.5 flex h-5 w-5 items-center justify-center">
        <SelectPrimitive.ItemIndicator className="field-select-check">
          <Check className="h-4 w-4" />
        </SelectPrimitive.ItemIndicator>
      </span>

      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
})
SelectItem.displayName = SelectPrimitive.Item.displayName

const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-muted", className)}
    {...props}
  />
))
SelectSeparator.displayName = SelectPrimitive.Separator.displayName

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
}
