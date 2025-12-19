
/**
 * fineTuningService.ts
 * 
 * Gemini Fine-Tuning Data Export
 * 
 * Features:
 * - Collect training examples from chat interactions
 * - Store RLHF feedback (thumbs up/down/flag)
 * - Export in Gemini fine-tuning JSONL format
 * - Quality filtering
 */

import { notificationService } from './notificationService';

// ============================================================================
// TYPES
// ============================================================================

export interface TrainingExample {
    id: string;
    timestamp: number;
    systemPrompt: string;
    userMessage: string;
    assistantResponse: string;
    rating: 'POSITIVE' | 'NEGATIVE' | 'FLAGGED' | 'NEUTRAL';
    metadata: {
        context?: string;
        toolsUsed?: string[];
        topicCategories?: string[];
        responseTime?: number;
    };
}

export interface FineTuningDataset {
    version: string;
    generatedAt: string;
    modelName: string;
    examples: FineTuningExample[];
    stats: {
        total: number;
        positive: number;
        negative: number;
        flagged: number;
    };
}

export interface FineTuningExample {
    messages: Array<{
        role: 'system' | 'user' | 'model';
        content: string;
    }>;
}

// ============================================================================
// INDEXEDDB SETUP
// ============================================================================

const DB_NAME = 'GridGuardTraining';
const DB_VERSION = 1;
const STORE_NAME = 'examples';

function openTrainingDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                store.createIndex('timestamp', 'timestamp', { unique: false });
                store.createIndex('rating', 'rating', { unique: false });
            }
        };
    });
}

// ============================================================================
// SYSTEM PROMPT TEMPLATE
// ============================================================================

const SYSTEM_PROMPT = `You are GridGuard AI, an expert assistant for electric grid operators managing the ERCOT (Texas) power system.

Core Competencies:
- Real-time grid monitoring and analysis
- Load forecasting and demand response
- NERC CIP compliance and cybersecurity
- Emergency operations procedures
- Market operations (SCED, LMP, congestion)
- Renewable integration (wind, solar)
- N-1 contingency analysis

Communication Style:
- Use BLUF (Bottom Line Up Front) format
- Be concise and professional
- Quantify when possible (MW, Hz, $)
- Cite relevant NERC standards when applicable
- Flag safety-critical information clearly

You have access to real-time grid data, weather forecasts, and historical event records.`;

// ============================================================================
// FINE-TUNING SERVICE
// ============================================================================

class FineTuningService {
    private examplesCache: TrainingExample[] = [];

    /**
     * Record a chat interaction as a training example
     */
    public async recordExample(
        userMessage: string,
        assistantResponse: string,
        context?: string,
        toolsUsed?: string[]
    ): Promise<string> {
        const id = `ex-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

        const example: TrainingExample = {
            id,
            timestamp: Date.now(),
            systemPrompt: SYSTEM_PROMPT,
            userMessage,
            assistantResponse,
            rating: 'NEUTRAL',
            metadata: {
                context,
                toolsUsed,
                topicCategories: this.detectTopics(userMessage + ' ' + assistantResponse)
            }
        };

        await this.saveExample(example);
        this.examplesCache.push(example);

        return id;
    }

    /**
     * Update rating for an example (RLHF feedback)
     */
    public async updateRating(id: string, rating: TrainingExample['rating']): Promise<void> {
        try {
            const db = await openTrainingDB();
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);

            const request = store.get(id);
            request.onsuccess = () => {
                const example = request.result as TrainingExample;
                if (example) {
                    example.rating = rating;
                    store.put(example);
                }
            };

            // Update cache
            const cached = this.examplesCache.find(e => e.id === id);
            if (cached) cached.rating = rating;

        } catch (e) {
            console.warn('[FINE-TUNING] Rating update failed:', e);
        }
    }

    /**
     * Get all training examples
     */
    public async getExamples(filter?: { rating?: TrainingExample['rating']; limit?: number }): Promise<TrainingExample[]> {
        try {
            const db = await openTrainingDB();
            const tx = db.transaction(STORE_NAME, 'readonly');

            return new Promise((resolve, reject) => {
                const request = tx.objectStore(STORE_NAME).getAll();
                request.onsuccess = () => {
                    let results = request.result as TrainingExample[];

                    if (filter?.rating) {
                        results = results.filter(e => e.rating === filter.rating);
                    }

                    results.sort((a, b) => b.timestamp - a.timestamp);

                    if (filter?.limit) {
                        results = results.slice(0, filter.limit);
                    }

                    this.examplesCache = results;
                    resolve(results);
                };
                request.onerror = () => reject(request.error);
            });
        } catch (e) {
            return [];
        }
    }

    /**
     * Export training data in Gemini fine-tuning format
     */
    public async exportForFineTuning(options: {
        includeNeutral?: boolean;
        excludeFlagged?: boolean;
        minExamples?: number;
    } = {}): Promise<FineTuningDataset | null> {
        const {
            includeNeutral = false,
            excludeFlagged = true,
            minExamples = 10
        } = options;

        const allExamples = await this.getExamples();

        // Filter based on options
        let filtered = allExamples;

        if (!includeNeutral) {
            filtered = filtered.filter(e => e.rating !== 'NEUTRAL');
        }

        if (excludeFlagged) {
            filtered = filtered.filter(e => e.rating !== 'FLAGGED');
        }

        // Only include positive and neutral (if enabled) examples for fine-tuning
        filtered = filtered.filter(e => e.rating === 'POSITIVE' || (includeNeutral && e.rating === 'NEUTRAL'));

        if (filtered.length < minExamples) {
            notificationService.warning(
                'Insufficient Data',
                `Need at least ${minExamples} positive examples. Currently have ${filtered.length}.`
            );
            return null;
        }

        // Convert to Gemini format
        const examples: FineTuningExample[] = filtered.map(ex => ({
            messages: [
                { role: 'system' as const, content: ex.systemPrompt },
                { role: 'user' as const, content: ex.userMessage },
                { role: 'model' as const, content: ex.assistantResponse }
            ]
        }));

        // Calculate stats
        const stats = {
            total: allExamples.length,
            positive: allExamples.filter(e => e.rating === 'POSITIVE').length,
            negative: allExamples.filter(e => e.rating === 'NEGATIVE').length,
            flagged: allExamples.filter(e => e.rating === 'FLAGGED').length
        };

        const dataset: FineTuningDataset = {
            version: '1.0',
            generatedAt: new Date().toISOString(),
            modelName: 'gemini-1.5-pro',
            examples,
            stats
        };

        return dataset;
    }

    /**
     * Export as JSONL file
     */
    public exportAsJSONL(dataset: FineTuningDataset): string {
        return dataset.examples
            .map(ex => JSON.stringify(ex))
            .join('\n');
    }

    /**
     * Download dataset as JSONL file
     */
    public async downloadDataset(): Promise<void> {
        const dataset = await this.exportForFineTuning({ includeNeutral: true });

        if (!dataset) return;

        const jsonl = this.exportAsJSONL(dataset);
        const blob = new Blob([jsonl], { type: 'application/jsonl' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `gridguard_training_${new Date().toISOString().split('T')[0]}.jsonl`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        notificationService.success(
            'Export Complete',
            `${dataset.examples.length} examples exported for fine-tuning`
        );
    }

    /**
     * Detect topics from text for categorization
     */
    private detectTopics(text: string): string[] {
        const topics: string[] = [];
        const lower = text.toLowerCase();

        const topicKeywords: Record<string, string[]> = {
            'load-management': ['load', 'demand', 'shedding', 'curtailment'],
            'frequency': ['frequency', 'hz', 'hertz', 'spinning reserve'],
            'renewable': ['wind', 'solar', 'renewable', 'curtail'],
            'emergency': ['emergency', 'outage', 'blackout', 'eea'],
            'market': ['price', 'lmp', 'sced', 'dispatch', 'settlement'],
            'cybersecurity': ['cyber', 'security', 'cip', 'scada', 'attack'],
            'weather': ['weather', 'storm', 'temperature', 'heat', 'freeze'],
            'compliance': ['nerc', 'compliance', 'standard', 'violation']
        };

        Object.entries(topicKeywords).forEach(([topic, keywords]) => {
            if (keywords.some(kw => lower.includes(kw))) {
                topics.push(topic);
            }
        });

        return topics;
    }

    /**
     * Get statistics
     */
    public async getStats(): Promise<{
        total: number;
        positive: number;
        negative: number;
        flagged: number;
        neutral: number;
        topTopics: Array<{ topic: string; count: number }>;
    }> {
        const examples = await this.getExamples();

        const topicCounts: Record<string, number> = {};
        examples.forEach(ex => {
            ex.metadata.topicCategories?.forEach(topic => {
                topicCounts[topic] = (topicCounts[topic] || 0) + 1;
            });
        });

        const topTopics = Object.entries(topicCounts)
            .map(([topic, count]) => ({ topic, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        return {
            total: examples.length,
            positive: examples.filter(e => e.rating === 'POSITIVE').length,
            negative: examples.filter(e => e.rating === 'NEGATIVE').length,
            flagged: examples.filter(e => e.rating === 'FLAGGED').length,
            neutral: examples.filter(e => e.rating === 'NEUTRAL').length,
            topTopics
        };
    }

    /**
     * Save example to IndexedDB
     */
    private async saveExample(example: TrainingExample): Promise<void> {
        const db = await openTrainingDB();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(example);
    }

    /**
     * Delete example
     */
    public async deleteExample(id: string): Promise<void> {
        try {
            const db = await openTrainingDB();
            const tx = db.transaction(STORE_NAME, 'readwrite');
            tx.objectStore(STORE_NAME).delete(id);
            this.examplesCache = this.examplesCache.filter(e => e.id !== id);
        } catch (e) { }
    }

    /**
     * Clear all examples
     */
    public async clearAll(): Promise<void> {
        try {
            const db = await openTrainingDB();
            const tx = db.transaction(STORE_NAME, 'readwrite');
            tx.objectStore(STORE_NAME).clear();
            this.examplesCache = [];
        } catch (e) { }
    }
}

export const fineTuningService = new FineTuningService();
