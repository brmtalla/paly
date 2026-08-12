import { useState, useRef, useCallback } from 'react';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config';
import SectionHeading from './SectionHeading';

type DemoState = 'idle' | 'uploading' | 'processing' | 'sending' | 'done' | 'error';

interface DemoProps {
  onComplete: (phone: string) => void;
}

export default function Demo({ onComplete }: DemoProps) {
  const [state, setState] = useState<DemoState>('idle');
  const [phone, setPhone] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setPhone(formatted);
  };

  const getRawPhone = () => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 10) return `+1${digits}`;
    if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
    return `+${digits}`;
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile && droppedFile.type === 'application/pdf') {
      setFile(droppedFile);
      setError('');
    } else {
      setError('Please upload a PDF file.');
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      if (selected.type !== 'application/pdf') {
        setError('Please upload a PDF file.');
        return;
      }
      if (selected.size > 10 * 1024 * 1024) {
        setError('File must be under 10 MB.');
        return;
      }
      setFile(selected);
      setError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!file) {
      setError('Please upload a PDF.');
      return;
    }

    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) {
      setError('Please enter a valid phone number.');
      return;
    }

    try {
      setState('uploading');

      const reader = new FileReader();
      const fileData = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      setState('processing');

      const response = await fetch(`${SUPABASE_URL}/functions/v1/demo-synthesis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          fileData,
          fileName: file.name,
          phoneNumber: getRawPhone(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong. Try again.');
      }

      setState('sending');
      await new Promise((r) => setTimeout(r, 1500));

      setState('done');
      onComplete(getRawPhone());
    } catch (err) {
      setState('error');
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.');
    }
  };

  const stateMessages: Record<DemoState, string> = {
    idle: '',
    uploading: 'Uploading your PDF...',
    processing: 'Reading and synthesizing your material...',
    sending: 'Texting you the synthesis...',
    done: 'Check your texts!',
    error: '',
  };

  const isProcessing = state === 'uploading' || state === 'processing' || state === 'sending';

  return (
    <section id="demo" className="py-16 sm:py-20">
      <div className="mx-auto max-w-3xl px-6">
        <SectionHeading
          eyebrow="Try it now"
          title="Feed it a real lecture"
          body="Upload any lecture PDF and enter your number. Paly texts you back a synthesis of it — once, free, no account needed."
        />

        <div className="mt-10 rounded-3xl border border-paly-950/[0.07] bg-white p-7 shadow-[0_24px_60px_-30px_rgba(12,26,56,0.25)] sm:p-10">
          {state === 'done' ? (
            <div className="text-center py-8">
              <div className="animate-bubble-in mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-500/10 text-teal-600 ring-1 ring-teal-500/20">
                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="font-display text-2xl font-extrabold text-paly-950">On its way</h3>
              <p className="mx-auto mt-3 max-w-sm leading-relaxed text-paly-950/55">
                Check your texts — your synthesis is on its way. That&apos;s just a
                taste of what Paly does every day, automatically.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* File Upload */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-paly-950">
                  Lecture PDF
                </label>
                <div
                  className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-all duration-200 ease-out-quart ${
                    dragActive
                      ? 'scale-[1.01] border-paly-500 bg-paly-50'
                      : file
                        ? 'border-paly-300 bg-paly-50/60'
                        : 'border-paly-950/[0.12] hover:border-paly-300 hover:bg-paly-50/40'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={handleFileSelect}
                    disabled={isProcessing}
                  />

                  {file ? (
                    <div className="flex items-center justify-center gap-3">
                      <svg className="h-8 w-8 text-paly-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                      </svg>
                      <div className="text-left">
                        <p className="text-sm font-semibold text-paly-950">{file.name}</p>
                        <p className="text-xs text-paly-950/40">
                          {(file.size / 1024 / 1024).toFixed(1)} MB
                        </p>
                      </div>
                      {!isProcessing && (
                        <button
                          type="button"
                          className="ml-2 text-paly-950/40 transition-colors duration-200 hover:text-paly-950"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFile(null);
                          }}
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ) : (
                    <>
                      <svg className="mx-auto mb-3 h-10 w-10 text-paly-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                      </svg>
                      <p className="text-sm text-paly-950/55">
                        <span className="font-semibold text-paly-600">Click to upload</span> or drag
                        and drop
                      </p>
                      <p className="mt-1 text-xs text-paly-950/40">PDF up to 10 MB</p>
                    </>
                  )}
                </div>
              </div>

              {/* Phone Number */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-paly-950">
                  Your phone number
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium text-paly-950/40">
                    +1
                  </span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={handlePhoneChange}
                    placeholder="(555) 123-4567"
                    disabled={isProcessing}
                    className="w-full rounded-xl border border-paly-950/[0.12] bg-white py-3.5 pl-12 pr-4 text-paly-950 placeholder-paly-950/25 transition-all duration-200 focus:border-paly-500 focus:outline-none focus:ring-2 focus:ring-paly-500/25 disabled:opacity-50"
                  />
                </div>
                <p className="mt-2 text-xs leading-relaxed text-paly-950/40">
                  We&apos;ll text you the synthesis once. No spam, ever.
                </p>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 p-3">
                  <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={isProcessing}
                className="w-full rounded-xl bg-paly-600 py-4 font-semibold text-white shadow-lift transition-all duration-200 ease-out-quart hover:-translate-y-0.5 hover:bg-paly-500 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:bg-paly-600"
              >
                {isProcessing ? (
                  <span className="flex items-center justify-center gap-3">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    {stateMessages[state]}
                  </span>
                ) : (
                  'Text me the synthesis'
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
