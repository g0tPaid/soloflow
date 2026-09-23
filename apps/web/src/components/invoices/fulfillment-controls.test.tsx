import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { FulfillmentControls } from '@/components/invoices/fulfillment-controls';
import type { FulfillmentStatus } from '@flowbooks/shared';

function renderControls(status: FulfillmentStatus | null, layout: 'full' | 'compact' = 'full') {
  const onStatusChange = vi.fn();
  const onTrackingSave = vi.fn();
  render(
    <FulfillmentControls
      idPrefix="inv1"
      status={status}
      localTrackingNumber={status === 'CUSTOMER_RECEIVED' ? 'SF1' : null}
      internationalTrackingNumber={status === 'CUSTOMER_RECEIVED' ? 'INT9' : null}
      layout={layout}
      onStatusChange={onStatusChange}
      onTrackingSave={onTrackingSave}
    />,
  );
  return { onStatusChange, onTrackingSave };
}

describe('FulfillmentControls', () => {
  it('shows the six stages and sets the clicked one', () => {
    const { onStatusChange } = renderControls(null);
    expect(screen.getByRole('button', { name: '1. Local ordering completed' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '2. QC completed' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '3. Shipped out to shipping center in China' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '4. Went out international' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '5. Customer received' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '6. Order completed' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '2. QC completed' }));
    expect(onStatusChange).toHaveBeenCalledWith('QC_COMPLETED');
  });

  it('marks the current stage and keeps tracking locked until shipping starts', () => {
    renderControls('QC_COMPLETED');
    expect(screen.getByRole('button', { name: '2. QC completed' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByLabelText('China / domestic tracking')).toBeDisabled();
    expect(screen.getByLabelText('International tracking')).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Save tracking' })).not.toBeInTheDocument();
  });

  it('saves a China tracking number once the order reaches the shipping center', () => {
    const { onTrackingSave } = renderControls('SHIPPED_TO_CHINA_CENTER');
    const local = screen.getByLabelText('China / domestic tracking');
    expect(local).toBeEnabled();
    expect(screen.getByLabelText('International tracking')).toBeDisabled();

    fireEvent.change(local, { target: { value: '  SF123  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save tracking' }));
    expect(onTrackingSave).toHaveBeenCalledWith({ localTrackingNumber: 'SF123' });
  });

  it('keeps both tracking numbers editable after the order goes out internationally', () => {
    const { onTrackingSave } = renderControls('CUSTOMER_RECEIVED');
    expect(screen.getByLabelText('China / domestic tracking')).toBeEnabled();
    expect(screen.getByLabelText('International tracking')).toHaveValue('INT9');

    fireEvent.change(screen.getByLabelText('International tracking'), {
      target: { value: 'INT-NEW' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save tracking' }));
    expect(onTrackingSave).toHaveBeenCalledWith({
      localTrackingNumber: 'SF1',
      internationalTrackingNumber: 'INT-NEW',
    });
  });

  it('hides tracking fields on the compact list until shipping applies', () => {
    renderControls('QC_COMPLETED', 'compact');
    expect(screen.queryByLabelText('China / domestic tracking')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('International tracking')).not.toBeInTheDocument();
  });
});