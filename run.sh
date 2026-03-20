#!/bin/bash
set -e

echo "Starting Printer Pool..."

# Loop through PDFs
for pdf in /data/*.pdf; do
  [ -e "$pdf" ] || continue

  echo "Processing $pdf..."

  base=$(basename "$pdf" .pdf)
  ps_file="/data/${base}.ps"

  # Convert PDF to PostScript
  echo "Converting to PostScript..."
  gs -sDEVICE=ps2write -o "$ps_file" "$pdf"

  # Verify files exist
  if [[ ! -f "$pdf" ]]; then
    echo "ERROR: PDF missing: $pdf"
    exit 1
  fi

  if [[ ! -f "$ps_file" ]]; then
    echo "ERROR: PostScript not created: $ps_file"
    exit 1
  fi

  # Validate file types
  echo "Validating file formats..."
  file "$pdf" | grep -q "PDF document" || { echo "Invalid PDF"; exit 1; }
  file "$ps_file" | grep -q "PostScript" || { echo "Invalid PostScript"; exit 1; }

  # Simulated print (replace with real printer if configured)
  echo "Printing $pdf..."
  lp "$pdf" || echo "Print command failed (no printer configured, continuing)..."

  echo "$pdf processed successfully."
done

echo "All files processed. Printer Pool completed successfully."
