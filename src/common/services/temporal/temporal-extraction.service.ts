import { Injectable, Logger } from '@nestjs/common';

export interface TemporalInfo {
  hasTemporalQuery: boolean;
  dateFrom?: Date;
  dateTo?: Date;
  relativeTime?: string;
  temporalKeywords: string[];
  sortOrder?: 'asc' | 'desc';
  limit?: number;
}

@Injectable()
export class TemporalExtractionService {
  private readonly logger = new Logger(TemporalExtractionService.name);

  extractTemporalInfo(query: string): TemporalInfo {
    const normalizedQuery = query.toLowerCase();
    const now = new Date();

    const result: TemporalInfo = {
      hasTemporalQuery: false,
      temporalKeywords: [] as string[],
    };

    const temporalPatterns = {
      // Recent/Latest
      recent: /\b(terakhir|terbaru|paling baru|recent|latest|last)\b/i,

      // Earliest/First/Oldest
      earliest: /\b(paling awal|pertama|tertua|awal|oldest|earliest|first)\b/i,

      // Today
      today: /\b(hari ini|today)\b/i,

      // Yesterday
      yesterday: /\b(kemarin|yesterday)\b/i,

      // This week
      thisWeek: /\b(minggu ini|pekan ini|this week)\b/i,

      // Last week
      lastWeek: /\b(minggu lalu|pekan lalu|last week)\b/i,

      // This month
      thisMonth: /\b(bulan ini|this month)\b/i,

      // Last month
      lastMonth: /\b(bulan lalu|last month)\b/i,

      // This year
      thisYear: /\b(tahun ini|this year)\b/i,

      // Last N days
      lastNDays: /\b(\d+)\s*(hari|days?)\s*(terakhir|lalu|yang lalu|last|ago)\b/i,

      // Last N weeks
      lastNWeeks: /\b(\d+)\s*(minggu|pekan|weeks?)\s*(terakhir|lalu|yang lalu|last|ago)\b/i,

      // Last N months
      lastNMonths: /\b(\d+)\s*(bulan|months?)\s*(terakhir|lalu|yang lalu|last|ago)\b/i,

      // Specific date patterns (YYYY-MM-DD, DD/MM/YYYY, etc.)
      specificDate: /\b(\d{4}[-\/]\d{1,2}[-\/]\d{1,2}|\d{1,2}[-\/]\d{1,2}[-\/]\d{4})\b/i,

      // Date range
      dateRange: /\b(mulai|dari|from|sejak|since)\s+.*?\s+(sampai|hingga|nyampe|to|until)\b/i,
    };

    // Check for earliest/oldest (get oldest records first)
    if (temporalPatterns.earliest.test(normalizedQuery)) {
      result.hasTemporalQuery = true;
      result.temporalKeywords.push('earliest');
      result.relativeTime = 'all_data';
      result.sortOrder = 'asc'; // Sort ascending (oldest first)
      result.limit = this.extractLimit(normalizedQuery); // Extract limit if specified
      this.logger.debug(
        'Detected earliest/oldest query: retrieving from database with ascending sort',
      );
    }

    // Check for recent/latest (get newest records first)
    else if (temporalPatterns.recent.test(normalizedQuery)) {
      result.hasTemporalQuery = true;
      result.temporalKeywords.push('recent');
      result.relativeTime = 'all_data';
      result.sortOrder = 'desc'; // Sort descending (newest first)
      result.limit = this.extractLimit(normalizedQuery); // Extract limit if specified
      this.logger.debug(
        'Detected recent/latest query: retrieving from database with descending sort',
      );
    }

    // Check for today
    else if (temporalPatterns.today.test(normalizedQuery)) {
      result.hasTemporalQuery = true;
      result.temporalKeywords.push('today');
      result.dateFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      result.dateTo = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      result.relativeTime = 'today';
      this.logger.debug('Detected today query');
    }

    // Check for yesterday
    else if (temporalPatterns.yesterday.test(normalizedQuery)) {
      result.hasTemporalQuery = true;
      result.temporalKeywords.push('yesterday');
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      result.dateFrom = new Date(
        yesterday.getFullYear(),
        yesterday.getMonth(),
        yesterday.getDate(),
        0,
        0,
        0,
      );
      result.dateTo = new Date(
        yesterday.getFullYear(),
        yesterday.getMonth(),
        yesterday.getDate(),
        23,
        59,
        59,
      );
      result.relativeTime = 'yesterday';
      this.logger.debug('Detected yesterday query');
    }

    // Check for this week
    else if (temporalPatterns.thisWeek.test(normalizedQuery)) {
      result.hasTemporalQuery = true;
      result.temporalKeywords.push('this_week');
      const dayOfWeek = now.getDay();
      const startOfWeek = new Date(
        now.getTime() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1) * 24 * 60 * 60 * 1000,
      );
      result.dateFrom = new Date(
        startOfWeek.getFullYear(),
        startOfWeek.getMonth(),
        startOfWeek.getDate(),
        0,
        0,
        0,
      );
      result.dateTo = now;
      result.relativeTime = 'this_week';
      this.logger.debug('Detected this week query');
    }

    // Check for last week
    else if (temporalPatterns.lastWeek.test(normalizedQuery)) {
      result.hasTemporalQuery = true;
      result.temporalKeywords.push('last_week');
      const dayOfWeek = now.getDay();
      const startOfLastWeek = new Date(
        now.getTime() - (dayOfWeek === 0 ? 13 : dayOfWeek + 6) * 24 * 60 * 60 * 1000,
      );
      const endOfLastWeek = new Date(startOfLastWeek.getTime() + 6 * 24 * 60 * 60 * 1000);
      result.dateFrom = new Date(
        startOfLastWeek.getFullYear(),
        startOfLastWeek.getMonth(),
        startOfLastWeek.getDate(),
        0,
        0,
        0,
      );
      result.dateTo = new Date(
        endOfLastWeek.getFullYear(),
        endOfLastWeek.getMonth(),
        endOfLastWeek.getDate(),
        23,
        59,
        59,
      );
      result.relativeTime = 'last_week';
      this.logger.debug('Detected last week query');
    }

    // Check for this month
    else if (temporalPatterns.thisMonth.test(normalizedQuery)) {
      result.hasTemporalQuery = true;
      result.temporalKeywords.push('this_month');
      result.dateFrom = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      result.dateTo = now;
      result.relativeTime = 'this_month';
      this.logger.debug('Detected this month query');
    }

    // Check for last month
    else if (temporalPatterns.lastMonth.test(normalizedQuery)) {
      result.hasTemporalQuery = true;
      result.temporalKeywords.push('last_month');
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      result.dateFrom = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1, 0, 0, 0);
      result.dateTo = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      result.relativeTime = 'last_month';
      this.logger.debug('Detected last month query');
    }

    // Check for this year
    else if (temporalPatterns.thisYear.test(normalizedQuery)) {
      result.hasTemporalQuery = true;
      result.temporalKeywords.push('this_year');
      result.dateFrom = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
      result.dateTo = now;
      result.relativeTime = 'this_year';
      this.logger.debug('Detected this year query');
    }

    // Check for last N days
    else if (temporalPatterns.lastNDays.test(normalizedQuery)) {
      const match = normalizedQuery.match(temporalPatterns.lastNDays);
      if (match) {
        const days = parseInt(match[1], 10);
        result.hasTemporalQuery = true;
        result.temporalKeywords.push(`last_${days}_days`);
        result.dateFrom = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        result.dateTo = now;
        result.relativeTime = `last_${days}_days`;
        this.logger.debug(`Detected last ${days} days query`);
      }
    }

    // Check for last N weeks
    else if (temporalPatterns.lastNWeeks.test(normalizedQuery)) {
      const match = normalizedQuery.match(temporalPatterns.lastNWeeks);
      if (match) {
        const weeks = parseInt(match[1], 10);
        result.hasTemporalQuery = true;
        result.temporalKeywords.push(`last_${weeks}_weeks`);
        result.dateFrom = new Date(now.getTime() - weeks * 7 * 24 * 60 * 60 * 1000);
        result.dateTo = now;
        result.relativeTime = `last_${weeks}_weeks`;
        this.logger.debug(`Detected last ${weeks} weeks query`);
      }
    }

    // Check for last N months
    else if (temporalPatterns.lastNMonths.test(normalizedQuery)) {
      const match = normalizedQuery.match(temporalPatterns.lastNMonths);
      if (match) {
        const months = parseInt(match[1], 10);
        result.hasTemporalQuery = true;
        result.temporalKeywords.push(`last_${months}_months`);
        result.dateFrom = new Date(now.getFullYear(), now.getMonth() - months, now.getDate());
        result.dateTo = now;
        result.relativeTime = `last_${months}_months`;
        this.logger.debug(`Detected last ${months} months query`);
      }
    }

    // Detect sorting preferences
    this.detectSortingPreferences(normalizedQuery, result);

    if (result.hasTemporalQuery) {
      this.logger.log(
        `Temporal query detected: ${result.relativeTime}, from ${result.dateFrom?.toISOString()} to ${result.dateTo?.toISOString()}`,
      );
    }

    if (result.sortOrder) {
      this.logger.debug(`Sort order detected: ${result.sortOrder}`);
    }

    return result;
  }

  /**
   * Extract limit from query (e.g., "5 pemeriksaan terakhir" -> limit: 5)
   */
  private extractLimit(query: string): number {
    // Patterns: "5 pemeriksaan", "10 data", "3 records"
    const limitPatterns = [
      /\b(\d+)\s*(pemeriksaan|data|records?|hasil|items?|entries)\b/i,
      /\b(top|first|pertama)\s+(\d+)\b/i,
    ];

    for (const pattern of limitPatterns) {
      const match = query.match(pattern);
      if (match) {
        const num = parseInt(match[1] || match[2], 10);
        if (num > 0 && num <= 100) {
          this.logger.debug(`Extracted limit: ${num}`);
          return num;
        }
      }
    }

    // Default limit for temporal queries
    return 15;
  }

  /**
   * Detect sorting preferences from query
   */
  private detectSortingPreferences(query: string, result: TemporalInfo): void {
    // Patterns for ascending sort
    const ascPatterns =
      /\b(oldest|tertua|paling lama|ascending|asc|dari yang lama|mulai dari yang lama|paling awal|pertama)\b/i;
    // Patterns for descending sort
    const descPatterns =
      /\b(newest|terbaru|paling baru|descending|desc|dari yang baru|mulai dari yang baru|terakhir)\b/i;
    // Patterns for date sorting
    const datePatterns =
      /\b(berdasarkan tanggal|by date|sort by date|urutkan tanggal|sortir tanggal)\b/i;
    // Patterns for forcing date sort (e.g., "pemeriksaan terakhir", "laporan sebulan terakhir")
    const forceDateSortPatterns =
      /\b(terakhir|terbaru|paling baru|recent|latest|sebulan terakhir|bulan lalu|minggu lalu|hari ini|kemarin|paling awal|pertama|tertua)\b/i;

    // Check for explicit date sorting request
    if (datePatterns.test(query)) {
      if (descPatterns.test(query)) {
        result.sortOrder = 'desc';
      } else if (ascPatterns.test(query)) {
        result.sortOrder = 'asc';
      } else {
        // Default to descending (newest first) when sorting by date
        result.sortOrder = 'desc';
      }
    }

    // Force date sorting for temporal keywords without explicit sort order
    if (forceDateSortPatterns.test(query)) {
      // Check if it's an "earliest/oldest" query
      if (ascPatterns.test(query)) {
        result.sortOrder = 'asc'; // Oldest first
      } else if (descPatterns.test(query)) {
        result.sortOrder = 'desc'; // Newest first
      }
    }
  }

  /**
   * Convert temporal info to Qdrant filter format
   * Note: This is only used when fromDatabase is false
   */
  buildTemporalFilter(temporalInfo: TemporalInfo): any {
    if (!temporalInfo.hasTemporalQuery || (!temporalInfo.dateFrom && !temporalInfo.dateTo)) {
      return null;
    }

    const rangeCondition: any = {};

    if (temporalInfo.dateFrom) {
      rangeCondition.gte = temporalInfo.dateFrom.toISOString();
    }

    if (temporalInfo.dateTo) {
      rangeCondition.lte = temporalInfo.dateTo.toISOString();
    }

    return {
      key: 'date',
      range: rangeCondition,
    };
  }
}
