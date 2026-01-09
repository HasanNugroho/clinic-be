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
    'endokrin',
    'orthopedics',
    'orthopedi',
    'neurology',
    'neurologi',
    'obstetrics',
    'obstetri',
    'gynecology',
    'ginekologi',
    'kandungan',
    'kebidanan',
    'obgyn',
    'rheumatology',
    'reumatologi',
    'rematik',
    'kardiologi',
    'cardiology',
    'jantung',
    'pediatri',
    'pediatrics',
    'dermatologi',
    'dermatology',
    'oftalmologi',
    'ophthalmology',
    'otolaringologi',
    'otolaryngology',
    'urologi',
    'urology',
    'gastroenterologi',
    'gastroenterology',
    'pulmonologi',
    'pulmonology',
    'psikiatri',
    'psychiatry',
    'onkologi',
    'oncology',
    'bedah',
    'surgery',
    'spesialis',
    'dokter',
    'jadwal',
    'praktik',
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

    if (word.length <= 4) {
      return word;
    }

    let stemmed = word;

    stemmed = stemmed.replace(/^(mem|men|meng|meny|pem|pen|peng|peny|di|ke|se|ter|ber|per)/, '');

    if (stemmed.length > 3) {
      stemmed = stemmed.replace(/(kan|an|i)$/, '');
    }

    return stemmed.length > 0 ? stemmed : word;
  }
}
