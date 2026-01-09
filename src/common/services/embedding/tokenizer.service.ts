import { Injectable } from '@nestjs/common';

@Injectable()
export class TokenizerService {
  private readonly stopwords = new Set([
    'yang',
    'pada',
    'dari',
    'untuk',
    'ini',
    'adalah',
    'dengan',
    'tersedia',
    'dapat',
    'orang',
    'the',
    'a',
    'an',
    'and',
    'or',
    'but',
    'in',
    'on',
    'at',
    'to',
    'of',
  ]);

  private readonly medicalTerms = new Set([
    'endocrinology',
    'endokrinologi',
    'orthopedics',
    'orthopedi',
    'neurology',
    'neurologi',
    'obstetrics',
    'obstetri',
    'gynecology',
    'kandungan',
    'kebidanan',
    'rheumatology',
    'reumatologi',
  ]);

  tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .normalize('NFKC')
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 0 && !this.stopwords.has(t))
      .map((t) => this.stemDynamic(t));
  }

  private stemDynamic(word: string): string {
    if (this.medicalTerms.has(word)) {
      return word;
    }

    return word.replace(/^(di|ke|se|mem|men|meng|ter|ber|per)/, '').replace(/(kan|an|i|nya)$/, '');
  }
}
