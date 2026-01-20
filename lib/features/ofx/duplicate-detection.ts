/**
 * OFX Duplicate Detection Service
 *
 * Implements duplicate detection logic for OFX transactions by comparing:
 * - Date, amount, and description similarity
 * - OFX transaction ID matching for exact duplicates
 * - Confidence scoring for potential duplicates
 */

import { prisma } from '@/lib/core/database/client';
import type {
  OFXTransaction,
  DuplicateDetectionResult,
  DuplicateMatch,
  DuplicatePreview,
} from './types';
import { Prisma, type Transaction } from '@/app/generated/prisma';
import { logger } from '@/lib/core/logger/logger';
import {
  matchIncomingToExisting,
  type DuplicateMatchInput,
} from '@/lib/features/transactions/duplicate-matcher';

/**
 * Main duplicate detection service
 */
export class DuplicateDetectionService {
  private readonly EXACT_MATCH_THRESHOLD = 1.0;
  private readonly HIGH_CONFIDENCE_THRESHOLD = 0.8;
  private readonly MEDIUM_CONFIDENCE_THRESHOLD = 0.6;
  private readonly DATE_TOLERANCE_DAYS = 2;
  private readonly AMOUNT_TOLERANCE = 0.01;

  /**
   * Find duplicates for a list of OFX transactions
   */
  async findDuplicates(
    transactions: OFXTransaction[],
    bankAccountId: string
  ): Promise<DuplicateDetectionResult> {
    const duplicates: DuplicateMatch[] = [];
    const uniqueTransactions: OFXTransaction[] = [];

    const matchesByTx = await this.findMatchesForTransactions(
      transactions,
      bankAccountId
    );

    for (const tx of transactions) {
      const matches = matchesByTx.get(tx) ?? [];
      if (matches.length > 0) duplicates.push(...matches);
      else uniqueTransactions.push(tx);
    }

    const exactMatches = duplicates.filter((d) => d.isExactMatch).length;
    const potentialMatches = duplicates.filter((d) => !d.isExactMatch).length;

    return {
      duplicates,
      uniqueTransactions,
      summary: {
        total: transactions.length,
        duplicates: duplicates.length,
        unique: uniqueTransactions.length,
        exactMatches,
        potentialMatches,
      },
    };
  }

  /**
   * Check if a single transaction is a duplicate
   */
  async checkSingleTransaction(
    transaction: OFXTransaction,
    bankAccountId: string
  ): Promise<boolean> {
    const matches = await this.findMatchesForTransaction(
      transaction,
      bankAccountId
    );
    return matches.length > 0;
  }

  /**
   * Generate duplicate preview with recommendations
   */
  async generateDuplicatePreview(
    transactions: OFXTransaction[],
    bankAccountId: string
  ): Promise<DuplicatePreview[]> {
    const previews: DuplicatePreview[] = [];

    const matchesByTx = await this.findMatchesForTransactions(
      transactions,
      bankAccountId
    );

    for (const tx of transactions) {
      const matches = matchesByTx.get(tx) ?? [];
      previews.push({
        transaction: tx,
        matches,
        recommendation: this.getRecommendation(matches),
        reason: this.getRecommendationReason(matches),
      });
    }

    return previews;
  }

  /**
   * Batch match lookup to avoid N+1 queries.
   * Returns a Map keyed by the OFXTransaction object reference.
   */
  private async findMatchesForTransactions(
    transactions: OFXTransaction[],
    bankAccountId: string
  ): Promise<Map<OFXTransaction, DuplicateMatch[]>> {
    const results = new Map<OFXTransaction, DuplicateMatch[]>();
    if (transactions.length === 0) return results;

    // 1) Exact matches (single query with IN)
    const txIds = Array.from(
      new Set(
        transactions
          .map((t) => t.transactionId)
          .filter((id): id is string => !!id)
      )
    );

    let exactMatches: Transaction[] = [];
    let exactResult: Transaction[] | undefined | null;
    if (txIds.length > 0) {
      try {
        exactResult = await prisma.transaction.findMany({
          where: {
            bankAccountId,
            ofxTransId: { in: txIds },
          },
        });
      } catch (error) {
        logger.error('DuplicateDetectionService.findExactBatch failed', {
          event: 'duplicate_detection_exact_batch_error',
          bankAccountId,
          error,
        });
        exactResult = [];
      }
    }
    if (Array.isArray(exactResult)) {
      exactMatches = exactResult;
    }
    if (!exactResult && txIds.length === 1) {
      try {
        const fallback = await prisma.transaction.findFirst({
          where: {
            bankAccountId,
            ofxTransId: txIds[0],
          },
        });
        if (fallback) exactMatches = [fallback];
      } catch (error) {
        logger.error('DuplicateDetectionService.findExactSingle failed', {
          event: 'duplicate_detection_exact_single_error',
          bankAccountId,
          error,
        });
      }
    }

    const exactByOfxId = new Map<string, Transaction>();
    for (const ex of exactMatches) {
      if (ex.ofxTransId) exactByOfxId.set(ex.ofxTransId, ex);
    }

    const fuzzyCandidates: OFXTransaction[] = [];
    for (const tx of transactions) {
      const ofxId = tx.transactionId;
      if (ofxId && exactByOfxId.has(ofxId)) {
        const existing = exactByOfxId.get(ofxId)!;
        results.set(tx, [
          {
            ofxTransaction: tx,
            existingTransaction: existing,
            confidence: this.EXACT_MATCH_THRESHOLD,
            matchCriteria: ['ofx_transaction_id'],
            isExactMatch: true,
          },
        ]);
      } else {
        fuzzyCandidates.push(tx);
      }
    }

    if (fuzzyCandidates.length === 0) {
      return results;
    }

    // 2) Fuzzy candidates: fetch once by date range (still bounded by tolerance)
    const minDate = new Date(
      Math.min(...fuzzyCandidates.map((t) => t.date.getTime()))
    );
    const maxDate = new Date(
      Math.max(...fuzzyCandidates.map((t) => t.date.getTime()))
    );
    const startDate = new Date(minDate);
    startDate.setDate(startDate.getDate() - this.DATE_TOLERANCE_DAYS);
    const endDate = new Date(maxDate);
    endDate.setDate(endDate.getDate() + this.DATE_TOLERANCE_DAYS);

    let existingInRange: Transaction[] = [];
    try {
      const fuzzyResult = await prisma.transaction.findMany({
        where: {
          bankAccountId,
          date: { gte: startDate, lte: endDate },
        },
      });
      existingInRange = Array.isArray(fuzzyResult) ? fuzzyResult : [];
    } catch (error) {
      logger.error('DuplicateDetectionService.findFuzzyBatch failed', {
        event: 'duplicate_detection_fuzzy_batch_error',
        bankAccountId,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        error,
      });
      existingInRange = [];
    }

    const matched = matchIncomingToExisting({
      incoming: fuzzyCandidates as unknown as DuplicateMatchInput[],
      existing: existingInRange,
      options: {
        dateToleranceDays: this.DATE_TOLERANCE_DAYS,
        amountTolerance: this.AMOUNT_TOLERANCE,
      },
    });

    // Group matches by incoming OFXTransaction reference
    const grouped = new Map<OFXTransaction, DuplicateMatch[]>();
    for (const m of matched) {
      const incomingTx = m.incoming as unknown as OFXTransaction;
      const arr = grouped.get(incomingTx) ?? [];
      arr.push({
        ofxTransaction: incomingTx,
        existingTransaction: m.existing,
        confidence: m.confidence,
        matchCriteria: m.matchCriteria,
        isExactMatch: false,
      });
      grouped.set(incomingTx, arr);
    }

    for (const tx of fuzzyCandidates) {
      const txMatches = (grouped.get(tx) ?? [])
        .filter((m) => m.confidence >= this.MEDIUM_CONFIDENCE_THRESHOLD)
        .sort((a, b) => b.confidence - a.confidence);
      results.set(tx, txMatches);
    }

    return results;
  }

  /**
   * Find potential matches for a single transaction
   */
  private async findMatchesForTransaction(
    ofxTransaction: OFXTransaction,
    bankAccountId: string
  ): Promise<DuplicateMatch[]> {
    const map = await this.findMatchesForTransactions(
      [ofxTransaction],
      bankAccountId
    );
    return map.get(ofxTransaction) ?? [];
  }

  /**
   * Find exact match based on OFX transaction ID
   */
  private async findExactOFXMatch(
    ofxTransaction: OFXTransaction,
    bankAccountId: string
  ): Promise<DuplicateMatch | null> {
    if (!ofxTransaction.transactionId) {
      return null;
    }

    let existingTransaction: Transaction | null = null;
    try {
      existingTransaction = await prisma.transaction.findFirst({
        where: {
          bankAccountId,
          ofxTransId: ofxTransaction.transactionId,
        },
      });
    } catch (error) {
      logger.error('DuplicateDetectionService.findExactOFXMatch failed', {
        event: 'duplicate_detection_exact_match_error',
        bankAccountId,
        ofxTransId: ofxTransaction.transactionId,
        error,
      });
      return null;
    }

    if (!existingTransaction) {
      return null;
    }

    return {
      ofxTransaction,
      existingTransaction,
      confidence: this.EXACT_MATCH_THRESHOLD,
      matchCriteria: ['ofx_transaction_id'],
      isExactMatch: true,
    };
  }

  /**
   * Find fuzzy matches based on date, amount, and description similarity
   */
  private async findFuzzyMatches(
    ofxTransaction: OFXTransaction,
    bankAccountId: string
  ): Promise<DuplicateMatch[]> {
    // Create date range for search
    const startDate = new Date(ofxTransaction.date);
    startDate.setDate(startDate.getDate() - this.DATE_TOLERANCE_DAYS);

    const endDate = new Date(ofxTransaction.date);
    endDate.setDate(endDate.getDate() + this.DATE_TOLERANCE_DAYS);

    // Find potential matches within date range
    const ofxAmount = new Prisma.Decimal(ofxTransaction.amount);
    let potentialMatches: Transaction[] = [];
    try {
      potentialMatches = await prisma.transaction.findMany({
        where: {
          bankAccountId,
          date: {
            gte: startDate,
            lte: endDate,
          },
          // Match by same magnitude, allowing sign inversion (debit/credit normalization)
          OR: [{ amount: ofxAmount }, { amount: ofxAmount.neg() }],
        },
      });
    } catch (error) {
      logger.error('DuplicateDetectionService.findFuzzyMatches failed', {
        event: 'duplicate_detection_fuzzy_match_error',
        bankAccountId,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        error,
      });
      return [];
    }

    const matches: DuplicateMatch[] = [];

    for (const existingTransaction of potentialMatches) {
      const confidence = this.calculateConfidenceScore(
        ofxTransaction,
        existingTransaction
      );
      const matchCriteria = this.getMatchCriteria(
        ofxTransaction,
        existingTransaction
      );

      if (confidence >= this.MEDIUM_CONFIDENCE_THRESHOLD) {
        matches.push({
          ofxTransaction,
          existingTransaction,
          confidence,
          matchCriteria,
          isExactMatch: false,
        });
      }
    }

    // Sort by confidence (highest first)
    return matches.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Calculate confidence score for potential duplicate
   */
  private calculateConfidenceScore(
    ofxTransaction: OFXTransaction,
    existingTransaction: Transaction
  ): number {
    let score = 0;
    let maxScore = 0;

    // Date match (weight: 30%)
    const dateWeight = 0.3;
    const dateDiff = Math.abs(
      ofxTransaction.date.getTime() - existingTransaction.date.getTime()
    );
    const daysDiff = dateDiff / (1000 * 60 * 60 * 24);

    if (daysDiff === 0) {
      score += dateWeight;
    } else if (daysDiff <= 1) {
      score += dateWeight * 0.8;
    } else if (daysDiff <= 2) {
      score += dateWeight * 0.6;
    }
    maxScore += dateWeight;

    // Amount match (weight: 40%) - compare magnitude
    const amountWeight = 0.4;
    const ofxAmountNumber = Number(ofxTransaction.amount);
    const existingAmount = Number(existingTransaction.amount);

    if (
      Math.abs(Math.abs(ofxAmountNumber) - Math.abs(existingAmount)) <
      this.AMOUNT_TOLERANCE
    ) {
      score += amountWeight;
    }
    maxScore += amountWeight;

    // Description similarity (weight: 30%)
    const descriptionWeight = 0.3;
    const descriptionSimilarity = this.calculateStringSimilarity(
      ofxTransaction.description,
      existingTransaction.description
    );
    score += descriptionSimilarity * descriptionWeight;
    maxScore += descriptionWeight;

    return maxScore > 0 ? score / maxScore : 0;
  }

  /**
   * Calculate string similarity using Levenshtein distance
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    if (!str1 || !str2) return 0;

    // Normalize strings
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();

    if (s1 === s2) return 1;

    const distance = this.levenshteinDistance(s1, s2);
    const maxLength = Math.max(s1.length, s2.length);

    return maxLength > 0 ? 1 - distance / maxLength : 0;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1)
      .fill(null)
      .map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) {
      matrix[0][i] = i;
    }

    for (let j = 0; j <= str2.length; j++) {
      matrix[j][0] = j;
    }

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Get match criteria for a potential duplicate
   */
  private getMatchCriteria(
    ofxTransaction: OFXTransaction,
    existingTransaction: Transaction
  ): string[] {
    const criteria: string[] = [];

    // Check date match
    const dateDiff = Math.abs(
      ofxTransaction.date.getTime() - existingTransaction.date.getTime()
    );
    const daysDiff = dateDiff / (1000 * 60 * 60 * 24);

    if (daysDiff === 0) {
      criteria.push('exact_date');
    } else if (daysDiff <= 2) {
      criteria.push('similar_date');
    }

    // Check amount match (magnitude)
    const ofxAmountNumber = Number(ofxTransaction.amount);
    const existingAmount = Number(existingTransaction.amount);

    if (
      Math.abs(Math.abs(ofxAmountNumber) - Math.abs(existingAmount)) <
      this.AMOUNT_TOLERANCE
    ) {
      criteria.push('exact_amount');
    }

    // Check description similarity
    const descriptionSimilarity = this.calculateStringSimilarity(
      ofxTransaction.description,
      existingTransaction.description
    );

    if (descriptionSimilarity >= 0.9) {
      criteria.push('exact_description');
    } else if (descriptionSimilarity >= 0.7) {
      criteria.push('similar_description');
    }

    return criteria;
  }

  /**
   * Get recommendation based on matches
   */
  private getRecommendation(
    matches: DuplicateMatch[]
  ): 'skip' | 'import' | 'review' {
    if (matches.length === 0) {
      return 'import';
    }

    const hasExactMatch = matches.some((m) => m.isExactMatch);
    if (hasExactMatch) {
      return 'skip';
    }

    const hasHighConfidenceMatch = matches.some(
      (m) => m.confidence >= this.HIGH_CONFIDENCE_THRESHOLD
    );
    if (hasHighConfidenceMatch) {
      return 'review';
    }

    return 'review';
  }

  /**
   * Get recommendation reason
   */
  private getRecommendationReason(matches: DuplicateMatch[]): string {
    if (matches.length === 0) {
      return 'No duplicates found';
    }

    const hasExactMatch = matches.some((m) => m.isExactMatch);
    if (hasExactMatch) {
      return 'Exact OFX transaction ID match found';
    }

    const highestConfidence = Math.max(...matches.map((m) => m.confidence));
    if (highestConfidence >= this.HIGH_CONFIDENCE_THRESHOLD) {
      return `High confidence duplicate detected (${Math.round(
        highestConfidence * 100
      )}% match)`;
    }

    return `Potential duplicate detected (${Math.round(
      highestConfidence * 100
    )}% match)`;
  }
}

/**
 * Default instance for easy importing
 */
export const duplicateDetectionService = new DuplicateDetectionService();
