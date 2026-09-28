import fs from 'fs';
import path from 'path';
import PizZip from 'pizzip';

/**
 * The staff profile templates were authored with `{startDate | formatDate "MMM YYYY"}`.
 * The `angular-expressions` parser used by `utils/docx.ts` requires filter arguments to be
 * passed with a colon, i.e. `{startDate | formatDate:"MMM YYYY"}`, and fails to *compile*
 * the template otherwise (the failure is independent of the render data).
 *
 * This script inserts the missing colon in every `formatDate "<format>"` tag while leaving
 * the existing `&quot;` entities untouched, so the templates render as authored.
 */
const FILTER_WITH_ARG_REGEX = /(formatDate)[ \t]+(?=(&quot;|"))/g;

/**
 * Rewrites the mis-authored filter tags of a single docx template.
 * Returns true when the file was modified.
 */
export function fixProfileFilterTags(filePath: string): boolean {
  if (!filePath.endsWith('.docx')) {
    console.log(`Skipping non-docx file: ${filePath}`);
    return false;
  }

  const zip = new PizZip(fs.readFileSync(filePath));
  let fileModified = false;

  zip.file(/\.xml$/).forEach((f) => {
    const xml = f.asText();
    const fixed = xml.replace(FILTER_WITH_ARG_REGEX, '$1:');

    if (fixed !== xml) {
      const count = (xml.match(FILTER_WITH_ARG_REGEX) || []).length;
      zip.file(f.name, fixed);
      fileModified = true;
      console.log(`  -> fixed ${count} filter tag(s) in ${f.name}`);
    }
  });

  if (fileModified) {
    fs.writeFileSync(
      filePath,
      zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' })
    );
    console.log(`[UPDATED] ${filePath}`);
  } else {
    console.log(`[NO CHANGE NEEDED] ${filePath}`);
  }

  return fileModified;
}

/** Scans a directory (recursively) and fixes every .docx template found. */
export function processDirectory(dirPath: string) {
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      processDirectory(fullPath);
    } else if (entry.isFile() && entry.name.endsWith('.docx')) {
      fixProfileFilterTags(fullPath);
    }
  }
}

if (require.main === module) {
  const targetDir = process.argv[2] || path.join(__dirname, 'profiles');
  console.log(`Scanning directory for docx templates: ${targetDir}`);
  processDirectory(targetDir);
}
