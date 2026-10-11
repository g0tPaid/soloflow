import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { CurrencySelect } from '@/components/currency-select';

it('opens a currency dropdown and reports the chosen code', () => {
    const onChange = vi.fn();
    render(<CurrencySelect id="currency" value="USD" onChange={onChange} />);

    const menu = screen.getByLabelText('Currency');
    expect(menu.tagName).toBe('SELECT');
    expect(menu).toHaveValue('USD');
    expect(screen.getByRole('option', { name: /AED — UAE Dirham/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /CNY — Chinese Yuan/ })).toBeInTheDocument();

    fireEvent.change(menu, { target: { value: 'EUR' } });
    expect(onChange).toHaveBeenCalledWith('EUR');
  });
