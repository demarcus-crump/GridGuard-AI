
/**
 * researchAgent.ts
 * 
 * Research Agent for White Paper Discovery
 * 
 * Features:
 * - Search for relevant papers via web/AI
 * - Curated knowledge sources (NERC, ERCOT, IEEE, NIST, DOE)
 * - Context-aware suggestions
 * - One-click import to Knowledge Base
 */

import { genAiService } from './genAiService';
import { knowledgeService } from './knowledgeService';
import { notificationService } from './notificationService';

// ============================================================================
// TYPES
// ============================================================================

export interface ResearchPaper {
    id: string;
    title: string;
    source: string;
    url: string;
    description: string;
    relevanceScore: number;
    category: 'STANDARD' | 'WHITEPAPER' | 'PROCEDURE' | 'RESEARCH' | 'REGULATION';
    datePublished?: string;
    isImported: boolean;
}

export interface ResearchQuery {
    topic: string;
    context?: string;
    sources?: string[];
}

// ============================================================================
// CURATED KNOWLEDGE SOURCES
// ============================================================================

const KNOWLEDGE_SOURCES = {
    NERC: {
        name: 'North American Electric Reliability Corporation',
        baseUrl: 'https://www.nerc.com',
        description: 'Reliability standards and compliance guidelines',
        papers: [
            {
                id: 'nerc-cip-002',
                title: 'CIP-002: BES Cyber System Categorization',
                url: 'https://www.nerc.com/pa/Stand/Reliability%20Standards/CIP-002-5.1a.pdf',
                description: 'Standard for identifying and categorizing BES Cyber Systems for the application of cybersecurity requirements.',
                category: 'STANDARD' as const
            },
            {
                id: 'nerc-bal-001',
                title: 'BAL-001: Real Power Balancing Control Performance',
                url: 'https://www.nerc.com/pa/Stand/Reliability%20Standards/BAL-001-2.pdf',
                description: 'Standards for maintaining frequency through real power balancing.',
                category: 'STANDARD' as const
            },
            {
                id: 'nerc-top-001',
                title: 'TOP-001: Transmission Operations',
                url: 'https://www.nerc.com/pa/Stand/Reliability%20Standards/TOP-001-5.pdf',
                description: 'Requirements for operating within system operating limits.',
                category: 'STANDARD' as const
            },
            {
                id: 'nerc-eop-011',
                title: 'EOP-011: Emergency Operations',
                url: 'https://www.nerc.com/pa/Stand/Reliability%20Standards/EOP-011-3.pdf',
                description: 'Requirements for emergency operations including load shedding.',
                category: 'PROCEDURE' as const
            }
        ]
    },
    ERCOT: {
        name: 'Electric Reliability Council of Texas',
        baseUrl: 'https://www.ercot.com',
        description: 'Texas grid operations procedures and guides',
        papers: [
            {
                id: 'ercot-nprr',
                title: 'ERCOT Nodal Protocols',
                url: 'https://www.ercot.com/mktrules/nprotocols',
                description: 'Complete nodal market protocols for the ERCOT region.',
                category: 'PROCEDURE' as const
            },
            {
                id: 'ercot-ops-guide',
                title: 'ERCOT Operating Guides',
                url: 'https://www.ercot.com/mktrules/guides',
                description: 'Detailed operating procedures for grid operators.',
                category: 'PROCEDURE' as const
            },
            {
                id: 'ercot-sced',
                title: 'Security Constrained Economic Dispatch (SCED) Technical Document',
                url: 'https://www.ercot.com/content/wcm/training/194/sced_technical_document.pdf',
                description: 'Technical documentation on the SCED dispatch algorithm.',
                category: 'WHITEPAPER' as const
            }
        ]
    },
    NIST: {
        name: 'National Institute of Standards and Technology',
        baseUrl: 'https://www.nist.gov',
        description: 'AI governance and cybersecurity frameworks',
        papers: [
            {
                id: 'nist-ai-rmf',
                title: 'AI Risk Management Framework (AI RMF 1.0)',
                url: 'https://www.nist.gov/itl/ai-risk-management-framework',
                description: 'Framework for managing risks in AI systems.',
                category: 'REGULATION' as const
            },
            {
                id: 'nist-csf',
                title: 'Cybersecurity Framework 2.0',
                url: 'https://www.nist.gov/cyberframework',
                description: 'Framework for improving critical infrastructure cybersecurity.',
                category: 'REGULATION' as const
            },
            {
                id: 'nist-sp-800-82',
                title: 'SP 800-82: Guide to ICS Security',
                url: 'https://csrc.nist.gov/publications/detail/sp/800-82/rev-3/final',
                description: 'Guide to Industrial Control Systems (ICS) Security for SCADA systems.',
                category: 'STANDARD' as const
            }
        ]
    },
    DOE: {
        name: 'Department of Energy',
        baseUrl: 'https://www.energy.gov',
        description: 'Energy grid research and policy',
        papers: [
            {
                id: 'doe-grid-modernization',
                title: 'Grid Modernization Initiative',
                url: 'https://www.energy.gov/oe/grid-modernization-initiative',
                description: 'DOE initiative for modernizing the U.S. electric grid.',
                category: 'WHITEPAPER' as const
            },
            {
                id: 'doe-solar-futures',
                title: 'Solar Futures Study',
                url: 'https://www.energy.gov/eere/solar/solar-futures-study',
                description: 'Study on solar energy potential and grid integration.',
                category: 'RESEARCH' as const
            }
        ]
    },
    IEEE: {
        name: 'Institute of Electrical and Electronics Engineers',
        baseUrl: 'https://www.ieee.org',
        description: 'Electrical engineering standards',
        papers: [
            {
                id: 'ieee-2030',
                title: 'IEEE 2030: Smart Grid Interoperability',
                url: 'https://standards.ieee.org/standard/2030-2011.html',
                description: 'Guide for smart grid interoperability of energy technology.',
                category: 'STANDARD' as const
            },
            {
                id: 'ieee-1547',
                title: 'IEEE 1547: Interconnection Standards',
                url: 'https://standards.ieee.org/standard/1547-2018.html',
                description: 'Standard for interconnection of distributed resources.',
                category: 'STANDARD' as const
            }
        ]
    }
};

// ============================================================================
// RESEARCH AGENT
// ============================================================================

class ResearchAgent {
    private importedPapers: Set<string> = new Set();
    private listeners: ((papers: ResearchPaper[]) => void)[] = [];
    private cachedResults: ResearchPaper[] = [];

    constructor() {
        // Load imported papers from localStorage
        const saved = localStorage.getItem('IMPORTED_PAPERS');
        if (saved) {
            this.importedPapers = new Set(JSON.parse(saved));
        }
    }

    /**
     * Get all curated papers from all sources
     */
    public getAllCuratedPapers(): ResearchPaper[] {
        const papers: ResearchPaper[] = [];

        Object.entries(KNOWLEDGE_SOURCES).forEach(([sourceKey, source]) => {
            source.papers.forEach(paper => {
                papers.push({
                    ...paper,
                    source: source.name,
                    relevanceScore: 100,
                    isImported: this.importedPapers.has(paper.id)
                });
            });
        });

        return papers;
    }

    /**
     * Search for papers by topic
     */
    public async searchByTopic(query: ResearchQuery): Promise<ResearchPaper[]> {
        const { topic, context } = query;
        const allPapers = this.getAllCuratedPapers();

        // Score papers by relevance to topic
        const scored = allPapers.map(paper => {
            let score = 0;
            const topicLower = topic.toLowerCase();
            const titleLower = paper.title.toLowerCase();
            const descLower = paper.description.toLowerCase();

            // Title match
            if (titleLower.includes(topicLower)) score += 50;

            // Description match
            if (descLower.includes(topicLower)) score += 30;

            // Keyword matching
            const keywords = topicLower.split(' ');
            keywords.forEach(kw => {
                if (titleLower.includes(kw)) score += 10;
                if (descLower.includes(kw)) score += 5;
            });

            // Category bonuses based on context
            if (context?.includes('security') && paper.category === 'STANDARD') score += 20;
            if (context?.includes('emergency') && paper.category === 'PROCEDURE') score += 20;
            if (context?.includes('AI') && paper.source.includes('NIST')) score += 30;

            return { ...paper, relevanceScore: Math.min(100, score) };
        });

        // Sort by relevance and return top results
        const results = scored
            .filter(p => p.relevanceScore > 10)
            .sort((a, b) => b.relevanceScore - a.relevanceScore)
            .slice(0, 10);

        this.cachedResults = results;
        this.notifyListeners();

        return results;
    }

    /**
     * Get AI-suggested papers based on current context
     */
    public async getContextualSuggestions(currentContext: string): Promise<ResearchPaper[]> {
        // Use AI to extract key topics from context
        const prompt = `Given this grid operations context, extract 3-5 key topics that would benefit from research papers:

Context: ${currentContext}

Return ONLY a comma-separated list of topics, no explanations.`;

        try {
            const topics = await genAiService.sendMessage(prompt);
            const topicList = topics.split(',').map(t => t.trim());

            // Search for each topic and merge results
            const allResults: ResearchPaper[] = [];
            for (const topic of topicList.slice(0, 3)) {
                const results = await this.searchByTopic({ topic, context: currentContext });
                allResults.push(...results);
            }

            // Deduplicate and sort
            const unique = Array.from(new Map(allResults.map(p => [p.id, p])).values());
            return unique.sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, 8);
        } catch (e) {
            console.warn('[RESEARCH] AI suggestion failed, using fallback');
            return this.getAllCuratedPapers().slice(0, 5);
        }
    }

    /**
     * Import a paper to the Knowledge Base
     */
    public async importPaper(paper: ResearchPaper): Promise<boolean> {
        try {
            // Create a text representation of the paper
            const content = `
# ${paper.title}

**Source:** ${paper.source}
**Category:** ${paper.category}
**URL:** ${paper.url}

## Description
${paper.description}

---
*Imported via Research Agent on ${new Date().toISOString()}*
`;

            // Convert to file and ingest
            const blob = new Blob([content], { type: 'text/plain' });
            const file = new File([blob], `${paper.id}.md`, { type: 'text/plain' });

            await knowledgeService.ingestFile(file);

            // Mark as imported
            this.importedPapers.add(paper.id);
            localStorage.setItem('IMPORTED_PAPERS', JSON.stringify([...this.importedPapers]));

            notificationService.success('Paper Imported', `"${paper.title}" added to Knowledge Base`);

            // Update cached results
            this.cachedResults = this.cachedResults.map(p =>
                p.id === paper.id ? { ...p, isImported: true } : p
            );
            this.notifyListeners();

            return true;
        } catch (e) {
            notificationService.error('Import Failed', 'Could not import paper to Knowledge Base');
            return false;
        }
    }

    /**
     * Get papers by source
     */
    public getPapersBySource(sourceKey: string): ResearchPaper[] {
        const source = KNOWLEDGE_SOURCES[sourceKey as keyof typeof KNOWLEDGE_SOURCES];
        if (!source) return [];

        return source.papers.map(paper => ({
            ...paper,
            source: source.name,
            relevanceScore: 100,
            isImported: this.importedPapers.has(paper.id)
        }));
    }

    /**
     * Get available sources
     */
    public getSources(): Array<{ key: string; name: string; description: string; paperCount: number }> {
        return Object.entries(KNOWLEDGE_SOURCES).map(([key, source]) => ({
            key,
            name: source.name,
            description: source.description,
            paperCount: source.papers.length
        }));
    }

    /**
     * Subscribe to results updates
     */
    public subscribe(listener: (papers: ResearchPaper[]) => void): () => void {
        this.listeners.push(listener);
        listener(this.cachedResults);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    private notifyListeners() {
        this.listeners.forEach(l => l(this.cachedResults));
    }
}

export const researchAgent = new ResearchAgent();
