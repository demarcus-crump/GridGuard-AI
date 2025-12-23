
/**
 * vectorStore.ts
 * 
 * Enhanced RAG with Vector Database
 * 
 * Features:
 * - IndexedDB-backed embeddings storage
 * - Cosine similarity search
 * - Document chunking with overlap
 * - Embedding generation via Gemini
 * - Metadata filtering
 */

import { getActiveKey } from './apiConfig';
import { notificationService } from './notificationService';

// ============================================================================
// TYPES
// ============================================================================

export interface DocumentChunk {
    id: string;
    documentId: string;
    content: string;
    embedding: number[];
    metadata: {
        source: string;
        pageNumber?: number;
        chunkIndex: number;
        totalChunks: number;
        createdAt: number;
        category?: string;
    };
}

export interface Document {
    id: string;
    name: string;
    content: string;
    chunks: string[]; // Chunk IDs
    createdAt: number;
    metadata: Record<string, any>;
}

export interface SearchResult {
    chunk: DocumentChunk;
    similarity: number;
    document?: Document;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CHUNK_SIZE = 500; // Characters per chunk
const CHUNK_OVERLAP = 100; // Overlap between chunks
const EMBEDDING_MODEL = 'text-embedding-004';
const DB_NAME = 'GridGuardVectorStore';
const DB_VERSION = 1;
const CHUNKS_STORE = 'chunks';
const DOCS_STORE = 'documents';

// ============================================================================
// INDEXEDDB SETUP
// ============================================================================

function openVectorDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;

            if (!db.objectStoreNames.contains(CHUNKS_STORE)) {
                const chunksStore = db.createObjectStore(CHUNKS_STORE, { keyPath: 'id' });
                chunksStore.createIndex('documentId', 'documentId', { unique: false });
            }

            if (!db.objectStoreNames.contains(DOCS_STORE)) {
                db.createObjectStore(DOCS_STORE, { keyPath: 'id' });
            }
        };
    });
}

// ============================================================================
// VECTOR STORE
// ============================================================================

class VectorStore {
    private embeddingCache: Map<string, number[]> = new Map();
    private apiKey: string | null = null;

    constructor() {
        this.apiKey = getActiveKey('GOOGLE_API_KEY');
    }

    /**
     * Refresh API key
     */
    public refreshApiKey() {
        this.apiKey = getActiveKey('GOOGLE_API_KEY');
    }

    /**
     * Generate embedding for text using Gemini
     */
    private async generateEmbedding(text: string): Promise<number[]> {
        // Check cache first
        const cacheKey = text.substring(0, 100);
        if (this.embeddingCache.has(cacheKey)) {
            return this.embeddingCache.get(cacheKey)!;
        }

        if (!this.apiKey) {
            // Fallback: simple hash-based pseudo-embedding (for demo)
            return this.generatePseudoEmbedding(text);
        }

        try {
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent?key=${this.apiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        model: `models/${EMBEDDING_MODEL}`,
                        content: { parts: [{ text }] }
                    })
                }
            );

            if (!response.ok) {
                throw new Error('Embedding API failed');
            }

            const data = await response.json();
            const embedding = data.embedding?.values || [];

            // Cache the result
            this.embeddingCache.set(cacheKey, embedding);

            return embedding;
        } catch (e) {
            console.warn('[VECTOR] Embedding API failed, using pseudo-embedding');
            return this.generatePseudoEmbedding(text);
        }
    }

    /**
     * Generate pseudo-embedding for demo/fallback
     * Uses TF-IDF inspired approach
     */
    private generatePseudoEmbedding(text: string): number[] {
        const words = text.toLowerCase().split(/\s+/);
        const embedding = new Array(256).fill(0);

        // Grid-specific keywords with higher weights
        const keywords: Record<string, number> = {
            'load': 10, 'frequency': 12, 'voltage': 11, 'grid': 8,
            'generation': 10, 'transmission': 9, 'contingency': 15,
            'emergency': 14, 'outage': 13, 'shedding': 12,
            'reserve': 11, 'dispatch': 10, 'scada': 15,
            'cybersecurity': 14, 'nerc': 16, 'ercot': 16,
            'reliability': 12, 'compliance': 13, 'safety': 14
        };

        words.forEach((word, i) => {
            // Hash word to embedding position
            let hash = 0;
            for (let j = 0; j < word.length; j++) {
                hash = ((hash << 5) - hash) + word.charCodeAt(j);
                hash = hash & hash;
            }
            const idx = Math.abs(hash) % 256;

            // Add weight
            const weight = keywords[word] || 1;
            embedding[idx] += weight / words.length;
        });

        // Normalize
        const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
        return magnitude > 0 ? embedding.map(v => v / magnitude) : embedding;
    }

    /**
     * Calculate cosine similarity between two vectors
     */
    private cosineSimilarity(a: number[], b: number[]): number {
        if (a.length !== b.length) {
            // Handle mismatched dimensions
            const minLen = Math.min(a.length, b.length);
            a = a.slice(0, minLen);
            b = b.slice(0, minLen);
        }

        let dotProduct = 0;
        let normA = 0;
        let normB = 0;

        for (let i = 0; i < a.length; i++) {
            dotProduct += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }

        const denominator = Math.sqrt(normA) * Math.sqrt(normB);
        return denominator > 0 ? dotProduct / denominator : 0;
    }

    /**
     * Chunk text with overlap
     */
    private chunkText(text: string): string[] {
        const chunks: string[] = [];
        let start = 0;

        while (start < text.length) {
            let end = start + CHUNK_SIZE;

            // Try to end at a sentence boundary
            if (end < text.length) {
                const sentenceEnd = text.substring(start, end + 50).lastIndexOf('.');
                if (sentenceEnd > CHUNK_SIZE * 0.5) {
                    end = start + sentenceEnd + 1;
                }
            }

            chunks.push(text.substring(start, end).trim());
            start = end - CHUNK_OVERLAP;
        }

        return chunks.filter(c => c.length > 20);
    }

    /**
     * Add document to vector store
     */
    public async addDocument(
        name: string,
        content: string,
        metadata: Record<string, any> = {}
    ): Promise<string> {
        const documentId = `doc-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

        // Chunk the content
        const textChunks = this.chunkText(content);
        const chunkIds: string[] = [];

        console.log(`[VECTOR] Processing ${textChunks.length} chunks for "${name}"`);

        // Process each chunk
        for (let i = 0; i < textChunks.length; i++) {
            const chunkContent = textChunks[i];
            const embedding = await this.generateEmbedding(chunkContent);

            const chunk: DocumentChunk = {
                id: `chunk-${documentId}-${i}`,
                documentId,
                content: chunkContent,
                embedding,
                metadata: {
                    source: name,
                    chunkIndex: i,
                    totalChunks: textChunks.length,
                    createdAt: Date.now(),
                    ...metadata
                }
            };

            await this.saveChunk(chunk);
            chunkIds.push(chunk.id);
        }

        // Save document reference
        const document: Document = {
            id: documentId,
            name,
            content: content.substring(0, 1000) + (content.length > 1000 ? '...' : ''),
            chunks: chunkIds,
            createdAt: Date.now(),
            metadata
        };

        await this.saveDocument(document);

        console.log(`[VECTOR] Added document "${name}" with ${chunkIds.length} chunks`);
        return documentId;
    }

    /**
     * Search for similar content
     */
    public async search(query: string, topK: number = 5): Promise<SearchResult[]> {
        // Generate query embedding
        const queryEmbedding = await this.generateEmbedding(query);

        // Get all chunks
        const chunks = await this.getAllChunks();

        // Calculate similarities
        const results: SearchResult[] = chunks.map(chunk => ({
            chunk,
            similarity: this.cosineSimilarity(queryEmbedding, chunk.embedding)
        }));

        // Sort by similarity and return top K
        return results
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, topK)
            .filter(r => r.similarity > 0.1);
    }

    /**
     * Get context for a query (for RAG)
     */
    public async getContext(query: string, maxChars: number = 3000): Promise<string> {
        const results = await this.search(query, 8);

        if (results.length === 0) {
            return '';
        }

        let context = '## Relevant Context from Knowledge Base:\n\n';
        let charCount = 0;

        for (const result of results) {
            const chunkText = `[Source: ${result.chunk.metadata.source}]\n${result.chunk.content}\n\n`;

            if (charCount + chunkText.length > maxChars) break;

            context += chunkText;
            charCount += chunkText.length;
        }

        return context;
    }

    /**
     * Save chunk to IndexedDB
     */
    private async saveChunk(chunk: DocumentChunk): Promise<void> {
        const db = await openVectorDB();
        const tx = db.transaction(CHUNKS_STORE, 'readwrite');
        tx.objectStore(CHUNKS_STORE).put(chunk);
    }

    /**
     * Save document to IndexedDB
     */
    private async saveDocument(document: Document): Promise<void> {
        const db = await openVectorDB();
        const tx = db.transaction(DOCS_STORE, 'readwrite');
        tx.objectStore(DOCS_STORE).put(document);
    }

    /**
     * Get all chunks
     */
    private async getAllChunks(): Promise<DocumentChunk[]> {
        try {
            const db = await openVectorDB();
            const tx = db.transaction(CHUNKS_STORE, 'readonly');

            return new Promise((resolve, reject) => {
                const request = tx.objectStore(CHUNKS_STORE).getAll();
                request.onsuccess = () => resolve(request.result || []);
                request.onerror = () => reject(request.error);
            });
        } catch (e) {
            return [];
        }
    }

    /**
     * Get all documents
     */
    public async getDocuments(): Promise<Document[]> {
        try {
            const db = await openVectorDB();
            const tx = db.transaction(DOCS_STORE, 'readonly');

            return new Promise((resolve, reject) => {
                const request = tx.objectStore(DOCS_STORE).getAll();
                request.onsuccess = () => resolve(request.result || []);
                request.onerror = () => reject(request.error);
            });
        } catch (e) {
            return [];
        }
    }

    /**
     * Delete document and its chunks
     */
    public async deleteDocument(documentId: string): Promise<void> {
        try {
            const db = await openVectorDB();

            // Delete document
            const docTx = db.transaction(DOCS_STORE, 'readwrite');
            docTx.objectStore(DOCS_STORE).delete(documentId);

            // Delete all chunks for this document
            const chunks = await this.getAllChunks();
            const chunkTx = db.transaction(CHUNKS_STORE, 'readwrite');
            const store = chunkTx.objectStore(CHUNKS_STORE);

            chunks
                .filter(c => c.documentId === documentId)
                .forEach(c => store.delete(c.id));

            notificationService.info('Document Removed', 'Document deleted from vector store');
        } catch (e) {
            console.warn('[VECTOR] Delete failed:', e);
        }
    }

    /**
     * Get statistics
     */
    public async getStats(): Promise<{ documentCount: number; chunkCount: number }> {
        const docs = await this.getDocuments();
        const chunks = await this.getAllChunks();
        return { documentCount: docs.length, chunkCount: chunks.length };
    }

    /**
     * Clear all data
     */
    public async clear(): Promise<void> {
        try {
            const db = await openVectorDB();

            const tx1 = db.transaction(DOCS_STORE, 'readwrite');
            tx1.objectStore(DOCS_STORE).clear();

            const tx2 = db.transaction(CHUNKS_STORE, 'readwrite');
            tx2.objectStore(CHUNKS_STORE).clear();

            this.embeddingCache.clear();
        } catch (e) { }
    }
}

export const vectorStore = new VectorStore();
