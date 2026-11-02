import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { LineItemsEditor } from '@/components/invoices/line-items-editor';
import type { LineItemInput } from '@/lib/line-items';

function line(name: string): LineItemInput {
  return { name, description: '', quantity: 1, unitPrice: 10, taxRate: 0 };
}

function EditorHarness({ initial }: { initial: LineItemInput[] }) {
  const [items, setItems] = useState(initial);
  return <LineItemsEditor items={items} onChange={setItems} currency="USD" />;
}

function itemNames() {
  return screen
    .getAllByPlaceholderText('Product or service name')
    .map((input) => (input as HTMLInputElement).value);
}

describe('LineItemsEditor reorder', () => {
  it('moves items up and down and updates the name order', () => {
    render(<EditorHarness initial={[line('Alpha'), line('Bravo'), line('Charlie')]} />);

    expect(itemNames()).toEqual(['Alpha', 'Bravo', 'Charlie']);
    expect(screen.getByRole('button', { name: 'Move item 1 up' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move item 3 down' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Move item 2 up' }));
    expect(itemNames()).toEqual(['Bravo', 'Alpha', 'Charlie']);

    fireEvent.click(screen.getByRole('button', { name: 'Move item 1 down' }));
    expect(itemNames()).toEqual(['Alpha', 'Bravo', 'Charlie']);
  });

  it('keeps a second description line from Shift+Enter', () => {
    render(<EditorHarness initial={[line('Widget')]} />);

    const description = screen.getByPlaceholderText(
      'Extra details (optional). Enter or Shift+Enter for a new line',
    );
    expect(description.tagName).toBe('TEXTAREA');

    fireEvent.keyDown(description, { key: 'Enter', shiftKey: true });
    fireEvent.change(description, { target: { value: 'Line one\nLine two' } });

    expect(description).toHaveValue('Line one\nLine two');
  });

  it('hides move buttons when there is only one line', () => {
    render(<EditorHarness initial={[line('Only')]} />);
    expect(screen.queryByRole('button', { name: /Move item/ })).not.toBeInTheDocument();
  });
});
