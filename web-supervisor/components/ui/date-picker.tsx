"use client"

import * as React from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
  value: string;
  onChange: (val: string) => void;
  minDate?: Date;
  className?: string;
  label?: string;
}

export function DatePicker({
  value,
  onChange,
  minDate,
  className,
  label
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [date, setDate] = React.useState<Date | undefined>(
    value ? new Date(value + 'T00:00:00') : undefined
  )

  // Sync state if external value changes
  React.useEffect(() => {
    if (value) {
      setDate(new Date(value + 'T00:00:00'))
    }
  }, [value])

  const handleSelect = (newDate: Date | undefined) => {
    setDate(newDate)
  }

  const handleDone = () => {
    if (date) {
      onChange(format(date, "yyyy-MM-dd"))
    }
    setOpen(false)
  }

  const handleCancel = () => {
    setDate(value ? new Date(value + 'T00:00:00') : undefined)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-2 group",
            className
          )}
        >
          {label && <span className="text-[10px] font-extrabold text-slate-300 uppercase tracking-wider">{label}</span>}
          <div className="flex items-center gap-1.5 text-white font-extrabold cursor-pointer">
            {date ? format(date, "dd/MM/yyyy", { locale: es }) : <span>Seleccionar</span>}
            <CalendarIcon className="h-4 w-4 text-emerald-400 group-hover:scale-110 transition-transform" />
          </div>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-4 bg-card border-border shadow-2xl rounded-2xl" align="end">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleSelect}
          disabled={(d) => {
            if (!minDate) return false;
            const check = new Date(d);
            check.setHours(0,0,0,0);
            const min = new Date(minDate);
            min.setHours(0,0,0,0);
            return check < min;
          }}
          initialFocus
          locale={es}
          captionLayout="dropdown"
          fromYear={2020}
          toYear={2030}
        />
        <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-border">
          <Button variant="ghost" size="sm" onClick={handleCancel} className="text-xs font-bold">Cancelar</Button>
          <Button size="sm" onClick={handleDone} className="text-xs font-bold bg-[#7b61ff] hover:bg-[#7b61ff]/90 text-white">Aplicar</Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
