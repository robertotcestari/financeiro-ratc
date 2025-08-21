'use client'

import * as React from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

export interface ComboboxOption {
  value: string
  label: string
  keywords?: string[]
}

interface ComboboxProps {
  options: ComboboxOption[]
  value?: string
  onValueChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  className?: string
  disabled?: boolean
  allowClear?: boolean
  clearLabel?: string
  compact?: boolean
  'data-testid'?: string
}

export function Combobox({
  options,
  value,
  onValueChange,
  placeholder = 'Selecione...',
  searchPlaceholder = 'Buscar...',
  emptyMessage = 'Nenhum resultado encontrado.',
  className,
  disabled = false,
  allowClear = true,
  clearLabel = 'Todos',
  compact = false,
  'data-testid': dataTestId
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const buttonRef = React.useRef<HTMLButtonElement>(null)

  const selectedOption = options.find((option) => option.value === value)

  return (
    <Popover 
      open={open} 
      onOpenChange={(newOpen) => {
        setOpen(newOpen)
        if (!newOpen) {
          // When closing, keep focus on the button
          setTimeout(() => {
            buttonRef.current?.focus()
          }, 0)
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button
          ref={buttonRef}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'justify-between',
            compact ? 'h-6 px-2 text-xs' : '',
            className
          )}
          disabled={disabled}
          data-testid={dataTestId}
        >
          <span className={cn('truncate', compact ? 'text-xs' : '')}>
            {selectedOption ? selectedOption.label : (value === '' && allowClear ? clearLabel : placeholder)}
          </span>
          <ChevronsUpDown className={cn(
            'shrink-0 opacity-50',
            compact ? 'ml-1 h-3 w-3' : 'ml-2 h-4 w-4'
          )} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setOpen(false)
              buttonRef.current?.focus()
            }
            // Enter will select the item and then close
            if (e.key === 'Enter') {
              setTimeout(() => {
                setOpen(false)
                buttonRef.current?.focus()
              }, 100)
            }
          }}
        >
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {allowClear && (
                <CommandItem
                  value="__clear__"
                  keywords={[clearLabel]}
                  onSelect={() => {
                    onValueChange('')
                    // Keep focus on the combobox
                    setTimeout(() => {
                      buttonRef.current?.focus()
                    }, 0)
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === '' ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {clearLabel}
                </CommandItem>
              )}
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  keywords={[option.label, ...(option.keywords || [])]}
                  onSelect={(currentValue) => {
                    onValueChange(currentValue === value ? '' : currentValue)
                    // Keep focus on the combobox
                    setTimeout(() => {
                      buttonRef.current?.focus()
                    }, 0)
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === option.value ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}