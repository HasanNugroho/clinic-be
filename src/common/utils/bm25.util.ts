export interface SparseVector {
  indices: number[];
  values: number[];
}

export interface BM25State {
  k1: number;
  b: number;
  vocab: Map<string, number>;
  termFreqs: Record<string, number>[];
  docLengths: number[];
  avgDL: number;
  idf: (term: string) => number;
}

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(Boolean);
}

export function bm25QueryVector(bm25: BM25State, text: string): SparseVector {
  const { vocab, k1, idf } = bm25;

  const tf: Record<string, number> = {};
  for (const term of tokenize(text)) {
    tf[term] = (tf[term] ?? 0) + 1;
  }

  const indices: number[] = [];
  const values: number[] = [];

  for (const term in tf) {
    const index = vocab.get(term);
    if (index === undefined) continue;

    const freq = tf[term];
    const score = idf(term) * ((freq * (k1 + 1)) / (freq + k1));

    indices.push(index);
    values.push(score);
  }

  return { indices, values };
}

export function bm25DocVector(bm25: BM25State, docIndex: number): SparseVector {
  const { termFreqs, docLengths, avgDL, vocab, k1, b, idf } = bm25;

  const tf = termFreqs[docIndex];
  const dl = docLengths[docIndex];

  const indices: number[] = [];
  const values: number[] = [];

  for (const term in tf) {
    const freq = tf[term];
    const score = idf(term) * ((freq * (k1 + 1)) / (freq + k1 * (1 - b + b * (dl / avgDL))));

    indices.push(vocab.get(term)!);
    values.push(score);
  }

  return { indices, values };
}

export function buildBM25(docs: string[], opts: { k1?: number; b?: number } = {}): BM25State {
  const k1 = opts.k1 ?? 1.2;
  const b = opts.b ?? 0.75;

  const tokenized = docs.map(tokenize);
  const N = tokenized.length;

  const docLengths = tokenized.map((d) => d.length);
  const avgDL = docLengths.reduce((a, b) => a + b, 0) / N;

  const vocab = new Map<string, number>();
  const docFreq: Record<string, number> = {};
  const termFreqs: Record<string, number>[] = [];

  let vocabIndex = 0;

  tokenized.forEach((doc, i) => {
    const tf: Record<string, number> = {};
    for (const term of doc) {
      tf[term] = (tf[term] ?? 0) + 1;
    }
    termFreqs[i] = tf;

    for (const term in tf) {
      if (!vocab.has(term)) {
        vocab.set(term, vocabIndex++);
      }
      docFreq[term] = (docFreq[term] ?? 0) + 1;
    }
  });

  const idf = (term: string): number => {
    const df = docFreq[term] ?? 0;
    return Math.log(1 + (N - df + 0.5) / (df + 0.5));
  };

  return {
    k1,
    b,
    vocab,
    termFreqs,
    docLengths,
    avgDL,
    idf,
  };
}
