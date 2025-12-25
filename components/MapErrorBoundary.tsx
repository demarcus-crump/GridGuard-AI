import * as React from 'react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface Props {
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

// ============================================================================
// ERROR BOUNDARY COMPONENT
// ============================================================================

/**
 * Error Boundary for Grid Recon (Digital Twin) component.
 * Catches rendering errors and shows a fallback UI instead of crashing.
 * 
 * NOTE: Error Boundaries must be class components - cannot use hooks.
 */
export class MapErrorBoundary extends React.Component<Props, State> {
    // Explicit property declarations to satisfy TypeScript
    declare readonly props: Props;
    declare state: State;
    declare setState: React.Component<Props, State>['setState'];

    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null
        };
    }

    /**
     * Static lifecycle method called when a descendant throws.
     * Returns the new state to trigger a re-render with fallback UI.
     */
    static getDerivedStateFromError(error: Error): Partial<State> {
        return { hasError: true, error };
    }

    /**
     * Instance lifecycle method for logging/reporting.
     * Called after an error is caught.
     */
    componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
        console.error('[MapErrorBoundary] Caught error:', error);
        console.error('[MapErrorBoundary] Component stack:', errorInfo.componentStack);
    }

    /**
     * Handler to reset the error state and retry rendering.
     */
    handleRetry = (): void => {
        this.setState({ hasError: false, error: null });
    };

    /**
     * Render method - shows fallback UI on error, otherwise renders children.
     */
    render(): React.ReactNode {
        if (this.state.hasError) {
            // Allow custom fallback or use default error UI
            if (this.props.fallback) {
                return this.props.fallback;
            }

            // Default error fallback UI
            return (
                <div className="flex flex-col items-center justify-center h-full bg-black/90 text-white p-8">
                    <div className="w-16 h-16 border-2 border-red-500 flex items-center justify-center text-2xl font-bold mb-4">
                        !
                    </div>
                    <h2 className="text-lg font-bold text-red-400 mb-2">GRID RECON OFFLINE</h2>
                    <p className="text-sm text-gray-400 text-center max-w-md mb-4">
                        The 3D map encountered an error. This may be due to a network issue or browser limitation.
                    </p>
                    <code className="text-xs text-red-300/60 bg-black/50 p-2 rounded mb-4 max-w-md overflow-hidden">
                        {this.state.error?.message || 'Unknown error'}
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
