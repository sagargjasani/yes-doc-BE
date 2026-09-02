import fs from 'fs';
import path from 'path';
import PizZip from 'pizzip';

/**
 * Regex to identify docxtemplater image tags:
 * Matches:
 *  - {%tag_name}
 *  - {%%tag_name}
 *  - %tag_name
 *  - %%tag_name
 */
const IMAGE_TAG_REGEX = /(\{?%{1,2}[a-zA-Z0-9_.]+\}?)/g;
const SINGLE_IMAGE_TAG_REGEX = /^\{?%{1,2}[a-zA-Z0-9_.]+\}?$/;

/**
 * Processes a single docx file to ensure all image tags are isolated inside their own <w:r><w:t> tags.
 */
export function fixDocxImageTags(filePath: string): boolean {
  if (!filePath.endsWith('.docx')) {
    if (filePath.endsWith('.doc')) {
      console.log(`Skipping legacy binary .doc file (convert to .docx first): ${filePath}`);
    }
    return false;
  }

  const content = fs.readFileSync(filePath);
  const zip = new PizZip(content);
  let fileModified = false;

  zip.file(/\.xml$/).forEach((f) => {
    let xml = f.asText();
    let xmlChanged = false;

    // Replace <w:t> nodes containing image tags mixed with other text
    const wtRegex = /<w:t([^>]*)>([\s\S]*?)<\/w:t>/g;
    xml = xml.replace(wtRegex, (fullMatch, attrs, textContent) => {
      // Check if textContent contains an image tag
      if (!IMAGE_TAG_REGEX.test(textContent)) {
        return fullMatch;
      }

      // If the <w:t> contains ONLY the image tag, it's already properly isolated
      if (SINGLE_IMAGE_TAG_REGEX.test(textContent.trim())) {
        return fullMatch;
      }

      xmlChanged = true;

      // Split text content around image tags
      const parts = textContent.split(IMAGE_TAG_REGEX);
      let result = '';

      parts.forEach((part: string) => {
        if (!part) return;
        if (SINGLE_IMAGE_TAG_REGEX.test(part)) {
          // Close current <w:t> and <w:r>, create isolated <w:r><w:t>tag</w:t></w:r>, start new <w:r><w:t>
          result += `</w:t></w:r><w:r><w:t>${part}</w:t></w:r><w:r><w:t xml:space="preserve">`;
        } else {
          result += part;
        }
      });

      return `<w:t${attrs} xml:space="preserve">${result}</w:t>`;
    });

    if (xmlChanged) {
      zip.file(f.name, xml);
      fileModified = true;
      console.log(`  -> Isolated image tag(s) in XML part: ${f.name}`);
    }
  });

  if (fileModified) {
    const updatedBuffer = zip.generate({
      type: 'nodebuffer',
      compression: 'DEFLATE',
    });
    fs.writeFileSync(filePath, updatedBuffer);
    console.log(`[UPDATED] ${filePath}`);
  } else {
    console.log(`[NO CHANGE NEEDED] ${filePath}`);
  }

  return fileModified;
}

/**
 * Recursively scans directory for .docx files and processes them.
 */
export function processDirectory(dirPath: string) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      processDirectory(fullPath);
    } else if (entry.isFile() && (entry.name.endsWith('.docx') || entry.name.endsWith('.doc'))) {
      fixDocxImageTags(fullPath);
    }
  }
}

// Run script if executed directly
if (require.main === module) {
  const targetDir = __dirname;
  console.log(`Scanning directory for docx files: ${targetDir}`);
  processDirectory(targetDir);
}
