import React from 'react';

interface MapErrorBoundaryProps {
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

interface MapErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

/**
 * Error Boundary for Grid Recon (Digital Twin) component.
 * Catches rendering errors and shows a fallback UI instead of crashing.
 */
export class MapErrorBoundary extends React.Component<MapErrorBoundaryProps, MapErrorBoundaryState> {
    constructor(props: MapErrorBoundaryProps) {
        super(props);
        this.state = {
            hasError: false,
            error: null
        };
    }

    static getDerivedStateFromError(error: Error): MapErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
        console.error('[MapErrorBoundary] Caught error:', error, errorInfo);
    }

    handleRetry = (): void => {
        this.setState({ hasError: false, error: null });
    };

    render(): React.ReactNode {
        if (this.state.hasError) {
            return this.props.fallback || (
                <div className="flex flex-col items-center justify-center h-full bg-black/90 text-white p-8">
                    <div className="w-16 h-16 border-2 border-red-500 flex items-center justify-center text-2xl font-bold mb-4">
                        !
                    </div>
                    <h2 className="text-lg font-bold text-red-400 mb-2">GRID RECON OFFLINE</h2>
                    <p className="text-sm text-gray-400 text-center max-w-md mb-4">
                        The 3D map encountered an error. This may be due to a network issue or browser limitation.
                    </p>
                    <code className="text-xs text-red-300/60 bg-black/50 p-2 rounded mb-4 max-w-md overflow-hidden">
                        {this.state.error?.message}
                    </code>
                    <button
                        onClick={this.handleRetry}
                        className="px-4 py-2 bg-cyan-500 text-black font-bold rounded hover:bg-cyan-400 transition-colors"
                    >
                        RETRY
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
