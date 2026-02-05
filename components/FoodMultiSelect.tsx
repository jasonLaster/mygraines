"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { TOP_FOODS } from "@/lib/foods";

export interface FoodMultiSelectProps {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function FoodMultiSelect({
  value,
  onChange,
  placeholder = "Search or add foods...",
  className,
  disabled,
}: FoodMultiSelectProps) {
  const [open, setOpen] = React.useState(false);

  const toggle = (selectedValue: string) => {
    // cmdk may pass normalized (e.g. lowercased) value; find exact match from list
    const food = TOP_FOODS.find(
      (f) => f.toLowerCase() === selectedValue.toLowerCase()
    ) ?? selectedValue;
    const next = value.includes(food)
      ? value.filter((v) => v !== food)
      : [...value, food];
    onChange(next);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between rounded-2xl border border-gray-800 bg-surface-dark px-4 py-3 text-left font-normal text-text-dark hover:bg-gray-800/80 hover:text-text-dark",
            !value.length && "text-gray-500",
            className
          )}
        >
          <span className="truncate">
            {value.length > 0
              ? value.join(", ")
              : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] rounded-xl border border-gray-800 bg-surface-dark p-0" align="start">
        <Command className="rounded-lg border-0 bg-transparent">
          <CommandInput placeholder="Search foods..." className="h-10" />
          <CommandList>
            <CommandEmpty>No food found.</CommandEmpty>
            <CommandGroup>
              {TOP_FOODS.map((food) => {
                const selected = value.includes(food);
                return (
                  <CommandItem
                    key={food}
                    value={food}
                    onSelect={() => toggle(food)}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4 shrink-0",
                        selected ? "opacity-100 text-primary" : "opacity-0"
                      )}
                    />
                    {food}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
