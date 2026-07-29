import * as React from "react";
import { cn } from "@europmade/utils";

/**
 * File Upload — CMP-041 uit het EuropMade Design System (nieuw, eerst
 * toegepast in Partner Onboarding — Upload documenten-stap, components.md
 * CMP-041).
 *
 * Desktop/Tablet: dropzone (slepen-en-neerzetten) + bestandskiezer.
 * Mobiel: **geen** drag-and-drop — twee gelijkwaardige acties ("Foto maken"
 * via het `capture`-attribuut, en "Bestand kiezen"), conform de
 * architectuurreview-uitbreiding in `partner-onboarding/spec.md` Stap 4.
 * `<input type="file">` blijft op elke variant het fundament (toegankelijk
 * met toetsenbord/schermlezer); statuswijzigingen worden aangekondigd via
 * `aria-live`.
 */
export interface FileUploadProps {
  label: string;
  requirementLabel: string;
  value: File | null;
  onChange: (file: File | null) => void;
  error?: string;
  /** Standaard: PDF/JPG/PNG, conform spec §2.10 ("gangbare document-/beeldformaten"). */
  accept?: string;
  /** Standaard: 10 MB, "een redelijke maximale bestandsgrootte" (spec §2.10, implementatiedetail). */
  maxSizeBytes?: number;
  id?: string;
}

const DEFAULT_ACCEPT = "application/pdf,image/jpeg,image/png";
const DEFAULT_MAX_SIZE_BYTES = 10 * 1024 * 1024;

export const FileUpload = React.forwardRef<HTMLDivElement, FileUploadProps>(
  (
    {
      label,
      requirementLabel,
      value,
      onChange,
      error,
      accept = DEFAULT_ACCEPT,
      maxSizeBytes = DEFAULT_MAX_SIZE_BYTES,
      id,
    },
    ref,
  ) => {
    const [localError, setLocalError] = React.useState<string | null>(null);
    const [isDragOver, setIsDragOver] = React.useState(false);
    const generatedId = React.useId();
    const fieldId = id ?? generatedId;
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const cameraInputRef = React.useRef<HTMLInputElement>(null);

    const acceptedTypes = React.useMemo(
      () => accept.split(",").map((entry) => entry.trim()).filter(Boolean),
      [accept],
    );

    function validate(file: File): string | null {
      if (acceptedTypes.length > 0 && !acceptedTypes.includes(file.type)) {
        return "Ongeldig bestandsformaat — gebruik een PDF, JPG of PNG.";
      }
      if (file.size > maxSizeBytes) {
        return `Bestand is te groot (max. ${Math.round(maxSizeBytes / (1024 * 1024))} MB).`;
      }
      return null;
    }

    function handleFiles(fileList: FileList | null) {
      const file = fileList?.[0];
      if (!file) return;
      const validationError = validate(file);
      if (validationError) {
        setLocalError(validationError);
        onChange(null);
        return;
      }
      setLocalError(null);
      onChange(file);
    }

    const displayError = localError ?? error;

    return (
      <div
        ref={ref}
        className={cn(
          "mb-3 rounded-md border-[1.5px] border-dashed border-wf-400 p-4",
          value && "border-solid border-wf-800",
          displayError && "border-solid border-wf-700",
        )}
      >
        <div className="mb-1 text-xs font-semibold text-wf-700">{label}</div>
        <div className="mb-2.5 text-[10px] text-wf-500">{requirementLabel}</div>

        {value ? (
          <div className="flex items-center justify-between text-xs font-semibold text-wf-800">
            <span className="truncate">{value.name}</span>
            <button
              type="button"
              onClick={() => onChange(null)}
              className="ml-2 flex-shrink-0 text-[10.5px] font-normal text-wf-600 underline"
            >
              Verwijderen
            </button>
          </div>
        ) : (
          <>
            <div
              className={cn(
                "hidden items-center justify-between text-[11.5px] text-wf-600 tablet:flex",
                isDragOver && "text-wf-900",
              )}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={(event) => {
                event.preventDefault();
                setIsDragOver(false);
                handleFiles(event.dataTransfer.files);
              }}
            >
              <span>Sleep een bestand hierheen, of</span>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded border border-wf-700 bg-white px-3 py-1.5 text-[11px]"
              >
                Kies bestand
              </button>
            </div>

            <div className="flex gap-2 tablet:hidden">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="rounded border border-wf-800 bg-wf-800 px-3 py-1.5 text-[10px] font-semibold text-white"
              >
                📷 Foto maken
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded border border-wf-700 bg-white px-3 py-1.5 text-[10px] font-semibold"
              >
                Bestand kiezen
              </button>
            </div>
          </>
        )}

        <input
          ref={fileInputRef}
          id={fieldId}
          type="file"
          accept={accept}
          aria-label={label}
          className="hidden"
          onChange={(event) => handleFiles(event.target.files)}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          aria-label={`${label} — foto maken`}
          className="hidden"
          onChange={(event) => handleFiles(event.target.files)}
        />

        {displayError && (
          <p role="alert" aria-live="polite" className="mt-2 text-[10.5px] text-wf-700">
            {displayError}
          </p>
        )}
      </div>
    );
  },
);
FileUpload.displayName = "FileUpload";
