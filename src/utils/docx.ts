import fse from 'fs-extra';
import PizZip from 'pizzip';
import ImageModule from 'docxtemplater-image-module-free';
import Docxtemplater from 'docxtemplater';
import expressionParser from 'docxtemplater/expressions.js';
import dayjs from 'dayjs';
import { fixDocPrCorruptionModule } from './fixDocPrCorruptionModule';

export interface DocxImageOptions {
  centered?: boolean;
  fileType?: string;
  getImage?: (tagValue: string, tagName: string) => Buffer;
  getSize?: (img: any, tagValue: string, tagName: string) => [number, number];
}

export interface GenerateDocxOptions {
  templatePath: string;
  data: Record<string, any>;
  imageOptions?: DocxImageOptions;
  nullGetter?: (part: any) => string;
  parserOptions?: Parameters<typeof expressionParser.configure>[0];
}

/**
 * Renders a docx template with provided data payload and optional image configurations.
 */
export async function generateDocx(options: GenerateDocxOptions): Promise<Buffer> {
  const { templatePath, data, imageOptions, nullGetter, parserOptions } = options;

  const templateContent = await fse.readFile(templatePath);
  const zip = new PizZip(templateContent);

  const defaultImageOpts = {
    centered: imageOptions?.centered ?? false,
    fileType: imageOptions?.fileType ?? 'docx',
    getImage(tagValue: string, tagName: string) {
      if (imageOptions?.getImage) {
        return imageOptions.getImage(tagValue, tagName);
      }
      return fse.readFileSync(tagValue);
    },
    getSize(img: any, tagValue: string, tagName: string) {
      if (imageOptions?.getSize) {
        return imageOptions.getSize(img, tagValue, tagName);
      }
      return [55, 32];
    },
  };

  const imageModule = new ImageModule(defaultImageOpts);

  fixDocPrCorruptionModule.set({
    Lexer: (Docxtemplater as any).Lexer,
    zip: zip,
  });

  const parser = expressionParser.configure({
    ...parserOptions,
    filters: {
      formatDate: (input: any, format = 'DD/MM/YYYY') => {
        if (!input) return '';
        return dayjs(input).format(format);
      },
      upper: (input: any) => (input ? String(input).toUpperCase() : ''),
      lower: (input: any) => (input ? String(input).toLowerCase() : ''),
      ...parserOptions?.filters,
    },
  });

  const doc = new Docxtemplater(zip, {
    modules: [imageModule, fixDocPrCorruptionModule],
    parser,
    nullGetter(part: any) {
      if (nullGetter) {
        return nullGetter(part);
      }
      console.log('missing tag in docx ===>', part);
      return '';
    },
  });

  doc.render(data);

  return doc.toBuffer();
}

export { expressionParser };
