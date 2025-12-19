
import React, { useState, useEffect } from 'react';
import { Card } from '../components/Common/Card';
import { Button } from '../components/Common/Button';
import { dataService } from '../services/dataServiceFactory';

interface Insight {
   id: string;
   title: string;
   summary: string;
   author: string;
   date: string;
   url: string;
   tags: string[];
   thumbnailType: 'chart' | 'map' | 'heatmap';
   likes?: number;
}

export const Insights: React.FC = () => {
   const [activeTag, setActiveTag] = useState<string | null>(null);
   const [insights, setInsights] = useState<Insight[]>([]);
   const [isLoading, setIsLoading] = useState(false);

   const fetchNews = async () => {
      setIsLoading(true);
      const articles = await dataService.getMarketNews();

      if (articles.length > 0) {
         const transformed: Insight[] = articles.map((art: any, i: number) => ({
            id: art.url || `news-${i}`,
            title: art.title,
            summary: art.description || "No description available.",
            author: art.source?.name || art.author || 'GridGuard AI',
            date: new Date(art.publishedAt).toLocaleDateString(),
            url: art.url,
            tags: ['Market', 'ERCOT'],
            thumbnailType: i % 2 === 0 ? 'chart' : 'map',
            likes: 0
         }));
         setInsights(transformed);
      }
      setIsLoading(false);
   };

   useEffect(() => {
      fetchNews();
   }, []);

   const tags = Array.from(new Set(insights.flatMap(i => i.tags)));

   return (
      <div className="space-y-6">
         <header className="flex justify-between items-center">
            <div>
               <h2 className="text-2xl font-bold text-[var(--text-primary)]">Market Insights</h2>
               <p className="text-xs text-[var(--text-secondary)] mt-1">Real-time intelligence from NewsAPI (Filtered for Texas Grid/ERCOT)</p>
            </div>
            <div className="flex gap-2">
               <Button variant="primary" size="sm" onClick={fetchNews} disabled={isLoading}>
                  {isLoading ? "REFRESHING..." : "REFRESH FEED"}
               </Button>
            </div>
         </header>

         <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* MAIN FEED */}
            <div className="lg:col-span-3 space-y-6">
               {insights.length === 0 && !isLoading && (
                  <Card className="flex flex-col items-center justify-center py-12 text-center opacity-70">
                     <h3 className="text-lg font-bold text-[var(--text-primary)]">No Intelligence Briefings</h3>
                     <p className="text-sm text-[var(--text-secondary)]">Check connection to NewsAPI.</p>
                  </Card>
               )}

               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {insights.map((insight) => (
                     <div key={insight.id} className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-lg p-4 hover:shadow-md transition-all flex flex-col h-full animate-in fade-in slide-in-from-bottom-2">
                        <div className="flex justify-between items-start mb-3">
                           <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-[var(--bg-tertiary)] border border-[var(--border-muted)] flex items-center justify-center text-[10px] font-mono font-bold text-[var(--text-secondary)]">
                                 {insight.author.charAt(0)}
                              </div>
                              <div className="flex flex-col">
                                 <span className="text-xs font-bold text-[var(--text-primary)]">{insight.author}</span>
                                 <span className="text-[10px] text-[var(--text-muted)]">{insight.date}</span>
                              </div>
                           </div>
                        </div>

                        <h4 className="font-bold text-[var(--text-primary)] mb-2 leading-tight">{insight.title}</h4>
                        <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-4 flex-grow line-clamp-3">
                           {insight.summary}
                        </p>

                        <div className="flex items-center justify-between pt-3 border-t border-[var(--border-muted)] mt-auto">
                           <a
                              href={insight.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-bold text-[var(--text-link)] hover:underline"
                           >
                              Read Full Article
                           </a>
                        </div>
                     </div>
                  ))}
               </div>
            </div>

            {/* RIGHT SIDEBAR */}
            <div className="lg:col-span-1 space-y-6">
               <Card title="Data Sources">
                  <div className="p-2 text-xs text-[var(--text-secondary)]">
                     Monitoring 50+ energy news sources via NewsAPI.org.
                  </div>
               </Card>
            </div>
         </div>
      </div>
   );
};
