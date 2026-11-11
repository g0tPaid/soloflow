import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ImageUploadField } from '@/components/shared/image-upload-field';

describe('ImageUploadField', () => {
  it('opens the gallery without forcing the camera', () => {
    render(<ImageUploadField onChange={() => undefined} label="Product photo" />);

    const gallery = document.querySelector('input[data-source="gallery"]') as HTMLInputElement;
    const click = vi.spyOn(gallery, 'click').mockImplementation(() => undefined);

    fireEvent.click(screen.getByRole('button', { name: 'Gallery' }));

    expect(gallery).not.toHaveAttribute('capture');
    expect(click).toHaveBeenCalledOnce();
  });

  it('keeps a separate camera picker', () => {
    render(<ImageUploadField onChange={() => undefined} label="Product photo" />);

    const camera = document.querySelector('input[data-source="camera"]') as HTMLInputElement;
    const click = vi.spyOn(camera, 'click').mockImplementation(() => undefined);

    fireEvent.click(screen.getByRole('button', { name: 'Camera' }));

    expect(camera).toHaveAttribute('capture', 'environment');
    expect(click).toHaveBeenCalledOnce();
  });
});
