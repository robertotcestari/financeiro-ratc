/**
 * OFX Duplicate Detection Service
 *
 * Implements duplicate detection logic for OFX transactions by comparing:
 * - Date, amount, and description similarity
 * - OFX transaction ID matching for exact duplicates
 * - Confidence scoring for potential duplicates
 */

import { prisma } from '@/lib/database/client';
import type { OFXTransaction } from './types';
import { Prisma, type Transaction } from '@/app/generated/prisma';

export interface DuplicateMatch {
  ofxTransaction: OFXTransaction;
  existingTransaction: Transaction;
  confidence: number;
  matchCriteria: string[];
  isExactMatch: boolean;
}

export interface DuplicateDetectionResult {
  duplicates: DuplicateMatch[];
  uniqueTransactions: OFXTransaction[];
  summary: {
    total: number;
    duplicates: number;
    unique: number;
    exactMatches: number;
    potentialMatches: number;
  };
}

export interface DuplicatePreview {
  transaction: OFXTransaction;
  matches: DuplicateMatch[];
  recommendation: 'skip' | 'import' | 'review';
  reason: string;
}

/**
 * Main duplicate detection service
 */
export class DuplicateDetectionService {
  private readonly EXACT_MATCH_THRESHOLD = 1.0;
  private readonly HIGH_CONFIDENCE_THRESHOLD = 0.8;
  private readonly MEDIUM_CONFIDENCE_THRESHOLD = 0.6;
  private readonly DATE_TOLERANCE_DAYS = 2;

  /**
   * Find duplicates for a list of OFX transactions
   */
  async findDuplicates(
    transactions: OFXTransaction[],
    bankAccountId: string
  ): Promise<DuplicateDetectionResult> {
    const duplicates: DuplicateMatch[] = [];
    const uniqueTransactions: OFXTransaction[] = [];

    for (const transaction of transactions) {
      const matches = await this.findMatchesForTransaction(
        transaction,
        bankAccountId
      );

      if (matches.length > 0) {
        // Add all matches for this transaction
        duplicates.push(...matches);
      } else {
        uniqueTransactions.push(transaction);
      }
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

    for (const transaction of transactions) {
      const matches = await this.findMatchesForTransaction(
        transaction,
        bankAccountId
      );

      const preview: DuplicatePreview = {
        transaction,
        matches,
        recommendation: this.getRecommendation(matches),
        reason: this.getRecommendationReason(matches),
      };

      previews.push(preview);
    }

    return previews;
  }

  /**
   * Find potential matches for a single transaction
   */
  private async findMatchesForTransaction(
    ofxTransaction: OFXTransaction,
    bankAccountId: string
  ): Promise<DuplicateMatch[]> {
    // First, check for exact OFX transaction ID match
    const exactMatch = await this.findExactOFXMatch(
      ofxTransaction,
      bankAccountId
    );
    if (exactMatch) {
      return [exactMatch];
    }

    // Then check for fuzzy matches based on date, amount, and description
    const fuzzyMatches = await this.findFuzzyMatches(
      ofxTransaction,
      bankAccountId
    );

    // Filter matches by confidence threshold
    return fuzzyMatches.filter(
      (match) => match.confidence >= this.MEDIUM_CONFIDENCE_THRESHOLD
    );
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

    const existingTransaction = await prisma.transaction.findFirst({
      where: {
        bankAccountId,
        ofxTransId: ofxTransaction.transactionId,
      },
    });

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

    // Find potential matches within date range and same absolute amount
    const ofxAmount = new Prisma.Decimal(ofxTransaction.amount);
    const potentialMatches = await prisma.transaction.findMany({
      where: {
        bankAccountId,
        date: {
          gte: startDate,
          lte: endDate,
        },
        // Match by absolute amount equality to handle debit/credit sign normalization
        OR: [
          { amount: ofxAmount },
          { amount: ofxAmount.neg().abs() },
        ],
      },
    });

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

    // Amount match (weight: 40%)
    const amountWeight = 0.4;
    const ofxAmount = Number(ofxTransaction.amount);
    const existingAmount = Number(existingTransaction.amount);

    if (Math.abs(ofxAmount - existingAmount) < 0.01) {
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

    // Check amount match
    const ofxAmount = Number(ofxTransaction.amount);
    const existingAmount = Number(existingTransaction.amount);

    if (Math.abs(ofxAmount - existingAmount) < 0.01) {
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
