import type { UseFormRegisterReturn } from 'react-hook-form';
import type { ShipmentContact } from '@flowbooks/shared';
import { Input } from '@/components/ui/input';

type Props = {
  checked: boolean;
  checkbox: UseFormRegisterReturn;
  orderNumber: UseFormRegisterReturn;
  recipient: UseFormRegisterReturn;
  address: UseFormRegisterReturn;
  carrier: UseFormRegisterReturn;
  carrierValue?: string | null;
  contact: Record<keyof ShipmentContact, UseFormRegisterReturn>;
  weight: UseFormRegisterReturn;
  tracking?: UseFormRegisterReturn;
};

const carriers = [
  ['dhl', 'DHL'], ['fedex', 'FedEx'], ['ups', 'UPS'], ['usps', 'USPS'], ['royal-mail', 'Royal Mail'],
  ['canada-post', 'Canada Post'], ['australia-post', 'Australia Post'], ['china-post', 'China Post'],
  ['sf-express', 'SF Express'], ['yunexpress', 'YunExpress'], ['four-px', '4PX'],
  ['aliexpress', 'Cainiao'], ['yanwen', 'Yanwen'], ['unsupported', 'Other carrier'],
] as const;

export function DropshipInvoiceFields({ checked, checkbox, orderNumber, recipient, address, carrier, carrierValue, contact, weight, tracking }: Props) {
  return (
    <fieldset className="space-y-3 rounded-xl border p-4">
      <legend className="px-1 text-sm font-medium">Dropshipping</legend>
      <label className="flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" className="size-4 accent-[#E40046]" {...checkbox} />
        This is a dropshipper invoice
      </label>
      {checked ? (
        <>
          <p className="text-xs text-muted-foreground">The linked partner can see these details once the order ships.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span>Partner’s customer order number</span>
              <Input maxLength={120} {...orderNumber} />
            </label>
            <label className="space-y-1 text-sm">
              <span>End recipient name</span>
              <Input maxLength={160} {...recipient} />
            </label>
            <label className="space-y-1 text-sm">
              <span>Street address</span>
              <Input maxLength={500} {...address} />
            </label>
            <label className="space-y-1 text-sm">
              <span>Recipient phone number</span>
              <Input type="tel" autoComplete="tel" maxLength={60} {...contact.phone} />
            </label>
            {([
              ['addressLine2', 'Apartment, suite or unit', 'address-line2', 200],
              ['city', 'City', 'address-level2', 120],
              ['region', 'State or province', 'address-level1', 120],
              ['postcode', 'Postal code', 'postal-code', 40],
              ['country', 'Country', 'country-name', 120],
            ] as const).map(([name, label, autoComplete, length]) => (
              <label key={name} className="space-y-1 text-sm">
                <span>{label}</span>
                <Input autoComplete={autoComplete} maxLength={length} {...contact[name]} />
              </label>
            ))}
            <label className="space-y-1 text-sm">
              <span>Shipping carrier</span>
              <select className="h-9 w-full rounded-md border bg-background px-3" {...carrier}>
                <option value="">Awaiting shipment</option>
                {carriers.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                {carrierValue && !carriers.some(([id]) => id === carrierValue) ? <option value={carrierValue}>{carrierValue}</option> : null}
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span>Shipment weight (kg)</span>
              <Input type="number" min={0} max={9999999} step="0.001" inputMode="decimal" {...weight} />
            </label>
            {tracking ? (
              <label className="space-y-1 text-sm">
                <span>Shipment tracking code</span>
                <Input maxLength={80} placeholder="Awaiting shipment" {...tracking} />
                <span className="block text-xs text-muted-foreground">Leave blank for Awaiting shipment. Entering a code marks the order as shipped.</span>
              </label>
            ) : null}
          </div>
        </>
      ) : null}
    </fieldset>
  );
}
