interface FixDocPrCorruptionOptions {
  Lexer?: any;
  zip?: any;
}

export const fixDocPrCorruptionModule = {
  Lexer: undefined as any,
  zip: undefined as any,
  attached: false,

  set(options: FixDocPrCorruptionOptions) {
    if (options.Lexer) {
      this.Lexer = options.Lexer;
    }
    if (options.zip) {
      this.zip = options.zip;
    }
  },

  on(event: string) {
    if (event === 'attached') {
      this.attached = false;
    }
    if (event !== 'syncing-zip') {
      return;
    }

    const zip = this.zip;
    const Lexer = this.Lexer;
    let prId = 1;

    function setSingleAttribute(
      partValue: string,
      attr: string,
      attrValue: number
    ) {
      const regex = new RegExp(`(<.* ${attr}=")([^"]+)(".*)$`);
      if (regex.test(partValue)) {
        return partValue.replace(regex, `$1${attrValue}$3`);
      }
      let end = partValue.lastIndexOf('/>');
      if (end === -1) {
        end = partValue.lastIndexOf('>');
      }
      return (
        partValue.substr(0, end) +
        ` ${attr}="${attrValue}"` +
        partValue.substr(end)
      );
    }

    zip.file(/\.xml$/).forEach(function (f: any) {
      let text = f.asText();
      const xmllexed = Lexer.xmlparse(text, {
        text: [],
        other: ['wp:docPr'],
      });
      if (xmllexed.length > 1) {
        text = xmllexed.reduce(function (fullText: string, part: any) {
          if (
            part.tag === 'wp:docPr' &&
            ['start', 'selfclosing'].indexOf(part.position) !== -1
          ) {
            return fullText + setSingleAttribute(part.value, 'id', prId++);
          }
          return fullText + part.value;
        }, '');
      }
      zip.file(f.name, text);
    });
  },
};
