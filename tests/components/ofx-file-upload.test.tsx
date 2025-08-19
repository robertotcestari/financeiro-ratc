/* @vitest-environment jsdom */
import React from 'react';
import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  type MockInstance,
} from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { OfxFileUpload } from '@/components/features/ofx/OfxFileUpload';
import { OFXParserService } from '@/lib/features/ofx/parser';
import type { OFXParseResult } from '@/lib/features/ofx/types';

function makeFile(
  name: string,
  content: string,
  type = 'application/ofx'
): File {
  return new File([content], name, { type });
}

describe('OfxFileUpload', () => {
  let validateFormatSpy: MockInstance;
  let parseFileSpy: MockInstance;

  beforeEach(() => {
    validateFormatSpy = vi
      .spyOn(OFXParserService.prototype, 'validateFormat')
      .mockReturnValue({
        isValid: true,
        format: 'XML',
        version: '2.x',
        errors: [],
      });

    parseFileSpy = vi
      .spyOn(OFXParserService.prototype, 'parseFile')
      .mockResolvedValue({
        success: true,
        version: '2.x',
        format: 'XML',
        accounts: [
          {
            accountId: 'A1',
            bankId: 'B1',
            accountType: 'CHECKING',
            accountNumber: 'A1',
          },
        ],
        transactions: [
          {
            transactionId: 'T1',
            accountId: 'A1',
            date: new Date(2024, 0, 15),
            amount: -50,
            description: 'Coffee Shop Purchase',
            type: 'DEBIT',
          },
          {
            transactionId: 'T2',
            accountId: 'A1',
            date: new Date(2024, 0, 20),
            amount: 1000,
            description: 'Salary Deposit',
            type: 'CREDIT',
          },
        ],
        errors: [],
      } as OFXParseResult);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders dropzone and button', () => {
    render(<OfxFileUpload />);
    expect(screen.getByTestId('ofx-dropzone')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /choose file/i })
    ).toBeInTheDocument();
  });

  it('shows error for invalid file extension', async () => {
    render(<OfxFileUpload />);

    const fileInput = screen.getByTestId('file-input') as HTMLInputElement;
    const badFile = makeFile('not-ofx.txt', '<OFX></OFX>', 'text/plain');

    fireEvent.change(fileInput, { target: { files: [badFile] } });

    // Should fail before calling parser
    expect(validateFormatSpy).not.toHaveBeenCalled();
    expect(parseFileSpy).not.toHaveBeenCalled();

    // Error message rendered
    await waitFor(() => {
      expect(screen.getByText(/invalid file type/i)).toBeInTheDocument();
    });
  });

  it('validates and parses a correct .ofx file, showing summary and message', async () => {
    const onValidated = vi.fn();
    render(<OfxFileUpload onValidated={onValidated} />);

    const fileInput = screen.getByTestId('file-input') as HTMLInputElement;
    const goodFile = makeFile(
      'sample.ofx',
      `<?xml version="1.0" encoding="UTF-8"?>
       <OFX><BANKMSGSRSV1></BANKMSGSRSV1></OFX>`,
      'application/ofx'
    );

    fireEvent.change(fileInput, { target: { files: [goodFile] } });

    // Wait for success state
    await waitFor(() => {
      expect(screen.getByText(/validation complete/i)).toBeInTheDocument();
    });

    // Summary should appear
    expect(screen.getByText(/format:/i)).toBeInTheDocument();
    expect(screen.getByText(/version:/i)).toBeInTheDocument();
    expect(screen.getByText(/accounts detected/i)).toHaveTextContent(
      'Accounts detected: 1'
    );
    expect(screen.getByText(/transactions detected/i)).toHaveTextContent(
      'Transactions detected: 2'
    );

    // Success message
    expect(screen.getByText(/detected xml 2\.x/i)).toBeInTheDocument();

    // Callback called with parse result
    expect(onValidated).toHaveBeenCalledTimes(1);
    const [resultArg, fileArg] = onValidated.mock.calls[0];
    expect(resultArg.success).toBe(true);
    expect(fileArg).toBeInstanceOf(File);
  });

  it('handles drag-and-drop upload', async () => {
    const onValidated = vi.fn();
    render(<OfxFileUpload onValidated={onValidated} />);

    const dropzone = screen.getByTestId('ofx-dropzone');
    const goodFile = makeFile(
      'dropped.ofx',
      `<?xml version="1.0"?><OFX><BANKMSGSRSV1/></OFX>`,
      'application/ofx'
    );

    fireEvent.dragOver(dropzone);
    fireEvent.drop(dropzone, {
      dataTransfer: { files: [goodFile] },
    });

    await waitFor(() => {
      expect(onValidated).toHaveBeenCalled();
    });
  });

  it('enforces file size limit with user feedback', async () => {
    render(<OfxFileUpload maxSizeMB={0.001} />); // very small limit

    const fileInput = screen.getByTestId('file-input') as HTMLInputElement;
    // Create a ~2KB content to exceed 0.001 MB (~1KB)
    const largeContent = 'x'.repeat(2048);
    const largeFile = makeFile('large.ofx', largeContent, 'application/ofx');

    fireEvent.change(fileInput, { target: { files: [largeFile] } });

    await waitFor(() => {
      expect(screen.getByText(/file too large/i)).toBeInTheDocument();
    });

    // Should not call parser
    expect(validateFormatSpy).not.toHaveBeenCalled();
    expect(parseFileSpy).not.toHaveBeenCalled();
  });
});
