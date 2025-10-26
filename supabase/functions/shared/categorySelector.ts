/**
 * Smart Category Selection for Domain Batches
 * Analyzes topic and funnel stage to select the most relevant domain batch
 */

import { DomainCategory, DomainBatch, getBatchForCategory } from './domainBatches.ts';

export interface CategorySelection {
  category: DomainCategory;
  domains: string[];
  reasoning: string;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Select the best category batch based on topic and funnel stage
 */
export function selectBestCategoryBatch(
  topic: string,
  funnelStage: 'TOFU' | 'MOFU' | 'BOFU',
  language: string
): CategorySelection {
  
  const topicLower = topic.toLowerCase();
  let selectedCategory: DomainCategory;
  let reasoning: string;
  let confidence: 'high' | 'medium' | 'low' = 'medium';
  
  // PHASE 1: Check for override keywords (highest priority)
  if (topicLower.match(/government|official|ministry|regulation|permit|visa|residency|immigration|citizenship/)) {
    selectedCategory = 'government';
    reasoning = 'Override: Official government topic detected';
    confidence = 'high';
  } 
  else if (topicLower.match(/property|real estate|home|villa|apartment|investment property|buying property|selling property/)) {
    selectedCategory = 'realEstate';
    reasoning = 'Override: Real estate topic detected';
    confidence = 'high';
  }
  else if (topicLower.match(/mortgage|bank|loan|finance|currency|exchange|money transfer|payment/)) {
    selectedCategory = 'financial';
    reasoning = 'Override: Financial topic detected';
    confidence = 'high';
  }
  else if (topicLower.match(/tourism|travel|destination|attraction|things to do|visit|explore|vacation/)) {
    selectedCategory = 'tourism';
    reasoning = 'Override: Tourism topic detected';
    confidence = 'high';
  }
  
  // PHASE 2: Funnel stage analysis (if no override)
  else if (funnelStage === 'TOFU') {
    // Top of funnel - Awareness stage
    if (topicLower.match(/lifestyle|living|beach|climate|culture|food|weather|area|location|guide|neighborhood|expat|community/)) {
      selectedCategory = 'tourism';
      reasoning = 'TOFU: Lifestyle/awareness content - tourism sources ideal';
      confidence = 'high';
    } 
    else if (topicLower.match(/market|trend|statistics|data|overview|introduction|explained|understanding|basics/)) {
      selectedCategory = 'news';
      reasoning = 'TOFU: Market overview content - news sources provide context';
      confidence = 'medium';
    } 
    else {
      selectedCategory = 'tourism';
      reasoning = 'TOFU: Default to tourism for awareness content';
      confidence = 'low';
    }
  }
  
  else if (funnelStage === 'MOFU') {
    // Middle of funnel - Consideration stage
    if (topicLower.match(/buying|process|steps|how to|guide|tips|considerations|checklist|timeline|stages/)) {
      selectedCategory = 'realEstate';
      reasoning = 'MOFU: How-to/process content - real estate expertise needed';
      confidence = 'high';
    }
    else if (topicLower.match(/compare|comparison|vs|versus|difference|options|types|choosing|deciding/)) {
      selectedCategory = 'news';
      reasoning = 'MOFU: Comparative analysis - news sources provide balanced views';
      confidence = 'medium';
    }
    else if (topicLower.match(/cost|price|budget|afford|calculate|estimate|expenses/)) {
      selectedCategory = 'financial';
      reasoning = 'MOFU: Cost analysis - financial sources provide data';
      confidence = 'high';
    }
    else {
      selectedCategory = 'realEstate';
      reasoning = 'MOFU: Default to real estate for consideration content';
      confidence = 'low';
    }
  }
  
  else {
    // Bottom of funnel - Decision stage (BOFU)
    if (topicLower.match(/tax|legal|law|visa|residency|permit|regulation|contract|documentation|paperwork/)) {
      selectedCategory = 'government';
      reasoning = 'BOFU: Legal/regulatory content - government sources authoritative';
      confidence = 'high';
    }
    else if (topicLower.match(/mortgage|finance|investment|return|roi|loan|interest|bank|financing/)) {
      selectedCategory = 'financial';
      reasoning = 'BOFU: Financial decision content - financial sources essential';
      confidence = 'high';
    }
    else if (topicLower.match(/lawyer|notary|agent|service|professional|consultant|advisor|help/)) {
      selectedCategory = 'realEstate';
      reasoning = 'BOFU: Professional services content - real estate sources';
      confidence = 'medium';
    }
    else {
      selectedCategory = 'government';
      reasoning = 'BOFU: Default to government for decision stage';
      confidence = 'low';
    }
  }
  
  // Get the batch
  const batch = getBatchForCategory(language, selectedCategory);
  
  // Log selection
  console.log(`
🎯 Category Selection:
  Topic: "${topic}"
  Funnel: ${funnelStage}
  Language: ${language}
  → Selected: ${selectedCategory}
  → Domains: ${batch.count}
  → Confidence: ${confidence}
  → Reasoning: ${reasoning}
  `);
  
  return {
    category: selectedCategory,
    domains: batch.domains,
    reasoning,
    confidence
  };
}
