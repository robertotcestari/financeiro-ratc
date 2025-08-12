'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { OFXParserService } from '@/lib/ofx/parser';
import type { OFXParseResult } from '@/lib/ofx/types';

type Status = 'idle' | 'reading' | 'validating' | 'parsing' | 'done' | 'error';

export interface OfxFileUploadProps {
  className?: string;
  /**
   * Maximum file size in MB. Default: 5
   */
  maxSizeMB?: number;
  /**
   * Called after parsing/validation completes (success or failure).
   * Consumers can decide how to proceed based on result.success
   */
  onValidated?: (result: OFXParseResult, file: File) => void;
}

export function OfxFileUpload({
  className,
  maxSizeMB = 5,
  onValidated,
}: OfxFileUploadProps) {
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [status, setStatus] = React.useState<Status>('idle');
  const [progress, setProgress] = React.useState(0);
  const [fileName, setFileName] = React.useState<string | null>(null);
  const [messages, setMessages] = React.useState<string[]>([]);
  const [validationSummary, setValidationSummary] = React.useState<{
    format: string;
    version: string;
    accounts: number;
    transactions: number;
  } | null>(null);

  const parser = React.useMemo(() => new OFXParserService(), []);

  const allowedMimeTypes = React.useMemo(
    () => [
      'application/x-ofx',
      'application/ofx',
      'text/xml',
      'application/xml',
      'application/octet-stream', // some browsers mark unknown types as octet-stream
      '',
    ],
    []
  );

  function resetUI() {
    setStatus('idle');
    setProgress(0);
    setMessages([]);
    setFileName(null);
    setValidationSummary(null);
  }

  function setErrorMessages(errs: string[]) {
    setMessages(errs);
    setStatus('error');
    setProgress(100);
  }

  function validateExtension(file: File): boolean {
    const name = file.name.toLowerCase();
    // Require .ofx extension for clarity. Many banks deliver .ofx for both 1.x and 2.x
    return name.endsWith('.ofx');
  }

  function validateMime(file: File): boolean {
    // Some environments/browsers don't provide a meaningful type for .ofx.
    // We only reject if it's an obviously disallowed type (like image/* or text/plain when not .ofx).
    if (!file.type) return true;
    return allowedMimeTypes.includes(file.type);
  }

  function validateSize(file: File): boolean {
    const maxBytes = maxSizeMB * 1024 * 1024;
    return file.size <= maxBytes;
  }

  async function handleFile(file: File) {
    resetUI();
    setFileName(file.name);

    // Basic validations
    const basicErrors: string[] = [];
    if (!validateExtension(file)) {
      basicErrors.push('Invalid file type. Please upload a .ofx file.');
    }
    if (!validateMime(file)) {
      basicErrors.push('Unsupported MIME type for OFX file.');
    }
    if (!validateSize(file)) {
      basicErrors.push(
        `File too large. Maximum allowed size is ${maxSizeMB} MB.`
      );
    }
    if (basicErrors.length > 0) {
      setErrorMessages(basicErrors);
      return;
    }

    try {
      // Step 1: Reading
      setStatus('reading');
      setProgress(30);
      const content = await readFileContent(file);

      // Step 2: Validating structure
      setStatus('validating');
      setProgress(60);
      const validation = parser.validateFormat(content);
      if (!validation.isValid) {
        const errs = validation.errors?.map(
          (e) => `${e.code}: ${e.message}`
        ) ?? ['Unknown validation error.'];
        setErrorMessages(errs);
        // Provide a synthetic result to callback for downstream handling
        const syntheticResult: OFXParseResult = {
          success: false,
          version: validation.version ?? '1.x',
          format: validation.format ?? 'SGML',
          accounts: [],
          transactions: [],
          errors: validation.errors,
        };
        onValidated?.(syntheticResult, file);
        return;
      }

      // Step 3: Parsing (includes association)
      setStatus('parsing');
      setProgress(85);
      const result = await parser.parseFile(file);

      // Done
      setStatus(result.success ? 'done' : 'error');
      setProgress(100);

      // Summarize for UI
      setValidationSummary({
        format: result.format,
        version: result.version,
        accounts: result.accounts.length,
        transactions: result.transactions.length,
      });

      // Show parse errors if any
      if (!result.success && result.errors.length > 0) {
        setMessages(result.errors.map((e) => `${e.code}: ${e.message}`));
      } else {
        setMessages([`Detected ${result.format} ${result.version}`]);
      }

      onValidated?.(result, file);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Unexpected error while reading file.';
      setErrorMessages([msg]);
    }
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) {
      void handleFile(f);
      // reset input so the same file can be reselected if desired
      e.target.value = '';
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      void handleFile(files[0]);
    }
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  }

  function onDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }

  function openFileDialog() {
    fileInputRef.current?.click();
  }

  return (
    <div className={cn('w-full max-w-xl space-y-4', className)}>
      <div
        data-testid="ofx-dropzone"
        className={cn(
          'rounded-md border-2 border-dashed p-6 text-center transition-colors',
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/30 hover:border-primary/60'
        )}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        role="button"
        aria-label="OFX file dropzone"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openFileDialog();
          }
        }}
        onClick={openFileDialog}
      >
        <input
          data-testid="file-input"
          ref={fileInputRef}
          type="file"
          accept=".ofx,application/x-ofx,application/ofx,text/xml,application/xml"
          className="hidden"
          onChange={onInputChange}
        />

        <div className="flex flex-col items-center gap-2">
          <div className="text-sm text-muted-foreground">
            Drag and drop an .ofx file here
          </div>
          <div className="text-xs text-muted-foreground">or</div>
          <Button type="button" size="sm">
            Choose file
          </Button>
          {fileName ? (
            <div className="mt-2 text-xs text-foreground">
              Selected: {fileName}
            </div>
          ) : null}
        </div>
      </div>

      {/* Progress and status */}
      {status !== 'idle' && (
        <div className="space-y-2">
          <Progress value={progress} />
          <div className="text-xs text-muted-foreground">
            {status === 'reading' && 'Reading file...'}
            {status === 'validating' && 'Validating OFX structure...'}
            {status === 'parsing' && 'Parsing OFX data...'}
            {status === 'done' && 'Validation complete.'}
            {status === 'error' && 'Validation failed.'}
          </div>
        </div>
      )}

      {/* Validation summary */}
      {validationSummary && (
        <div className="rounded-md border bg-card p-3 text-sm">
          <div>
            Format: <strong>{validationSummary.format}</strong> | Version:{' '}
            <strong>{validationSummary.version}</strong>
          </div>
          <div>
            Accounts detected: <strong>{validationSummary.accounts}</strong>
          </div>
          <div>
            Transactions detected:{' '}
            <strong>{validationSummary.transactions}</strong>
          </div>
        </div>
      )}

      {/* Messages / Errors */}
      {messages.length > 0 && (
        <div
          aria-live="polite"
          className={cn(
            'rounded-md border p-3 text-sm',
            status === 'error'
              ? 'border-destructive/40 bg-destructive/5 text-destructive'
              : 'border-muted-foreground/30 bg-muted/30 text-foreground'
          )}
        >
          <ul className="list-disc pl-5">
            {messages.map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/**
 * Read file content as text (browser)
 */
async function readFileContent(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve((e.target?.result as string) ?? '');
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

/**
 * Minimal, accessible progress bar
 */
function Progress({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamped}
      className="h-2 w-full overflow-hidden rounded bg-muted"
    >
      <div
        className="h-full bg-primary transition-[width] duration-300 ease-out"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

export default OfxFileUpload;
