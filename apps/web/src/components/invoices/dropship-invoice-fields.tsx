import type { UseFormRegisterReturn } from 'react-hook-form';
import { Input } from '@/components/ui/input';

type Props = {
  checked: boolean;
  checkbox: UseFormRegisterReturn;
  orderNumber: UseFormRegisterReturn;
  recipient: UseFormRegisterReturn;
  address: UseFormRegisterReturn;
  carrier: UseFormRegisterReturn;
};

export function DropshipInvoiceFields({ checked, checkbox, orderNumber, recipient, address, carrier }: Props) {
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
              <span>Delivery address</span>
              <Input maxLength={500} {...address} />
            </label>
            <label className="space-y-1 text-sm">
              <span>Shipping carrier</span>
              <Input maxLength={120} {...carrier} />
            </label>
          </div>
        </>
      ) : null}
    </fieldset>
  );
}
