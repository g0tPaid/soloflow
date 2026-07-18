'use client';

import { Plane, Ship, Truck } from 'lucide-react';
import {
  SHIPPING_METHODS,
  SHIPPING_TERMS,
  type ShippingMethod,
  type ShippingTerms,
} from '@flowbooks/shared';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

type Props = {
  method?: ShippingMethod | null;
  terms?: ShippingTerms | null;
  fromCountry?: string | null;
  toCountry?: string | null;
  onMethodChange: (value: ShippingMethod | undefined) => void;
  onTermsChange: (value: ShippingTerms | undefined) => void;
  onFromCountryChange: (value: string) => void;
  onToCountryChange: (value: string) => void;
  idPrefix?: string;
};

const methodIcons = {
  AIR: Plane,
  SEA: Ship,
  LOCAL: Truck,
} as const;

export function ShippingFields({
  method,
  terms,
  fromCountry,
  toCountry,
  onMethodChange,
  onTermsChange,
  onFromCountryChange,
  onToCountryChange,
  idPrefix = 'shipping',
}: Props) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Shipping method</Label>
        <div className="flex flex-wrap gap-2">
          {SHIPPING_METHODS.map((option) => {
            const Icon = methodIcons[option.value];
            const selected = method === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onMethodChange(selected ? undefined : option.value)}
                className={cn(
                  'inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition',
                  selected
                    ? 'border-red-600 bg-red-50 text-red-700 ring-1 ring-red-600'
                    : 'border-input bg-background text-muted-foreground hover:border-red-200 hover:bg-red-50/50',
                )}
              >
                <Icon className="h-4 w-4" />
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Shipping terms</Label>
        <div className="flex flex-wrap gap-2">
          {SHIPPING_TERMS.map((option) => {
            const selected = terms === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onTermsChange(selected ? undefined : option.value)}
                className={cn(
                  'rounded-lg border px-4 py-2.5 text-sm font-medium transition',
                  selected
                    ? 'border-red-600 bg-red-50 text-red-700 ring-1 ring-red-600'
                    : 'border-input bg-background text-muted-foreground hover:border-red-200 hover:bg-red-50/50',
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-from`}>From country</Label>
          <Input
            id={`${idPrefix}-from`}
            placeholder="e.g. India"
            value={fromCountry ?? ''}
            onChange={(e) => onFromCountryChange(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-to`}>To country</Label>
          <Input
            id={`${idPrefix}-to`}
            placeholder="e.g. United Arab Emirates"
            value={toCountry ?? ''}
            onChange={(e) => onToCountryChange(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
