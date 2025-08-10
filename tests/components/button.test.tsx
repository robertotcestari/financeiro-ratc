import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { Button } from '../../components/ui/button';

// Tell Vitest to use jsdom for this suite
// @vitest-environment jsdom

describe('Button', () => {
  it('renders with text', () => {
    render(<Button>Click me</Button>);
    expect(
      screen.getByRole('button', { name: /click me/i })
    ).toBeInTheDocument();
  });
});
