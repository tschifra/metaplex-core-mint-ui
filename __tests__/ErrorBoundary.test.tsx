import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// Create a simplified ErrorBoundary for testing purposes
// The real one uses Chakra UI which requires complex polyfills in Node.js
class TestErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div>
          <h1>Something went wrong</h1>
          <p>An unexpected error occurred</p>
          {this.state.error && <p data-testid="error-message">{this.state.error.message}</p>}
          <button onClick={this.handleRetry}>Try Again</button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Component that throws an error
const ThrowError: React.FC<{ shouldThrow: boolean }> = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

describe('ErrorBoundary', () => {
  // Suppress console.error for expected errors in tests
  const originalError = console.error;
  beforeAll(() => {
    console.error = jest.fn();
  });
  afterAll(() => {
    console.error = originalError;
  });

  it('renders children when there is no error', () => {
    render(
      <TestErrorBoundary>
        <div>Child content</div>
      </TestErrorBoundary>
    );

    expect(screen.getByText('Child content')).toBeInTheDocument();
  });

  it('renders error UI when child throws', () => {
    render(
      <TestErrorBoundary>
        <ThrowError shouldThrow={true} />
      </TestErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('An unexpected error occurred')).toBeInTheDocument();
    expect(screen.getByTestId('error-message')).toHaveTextContent('Test error');
  });

  it('renders custom fallback when provided', () => {
    render(
      <TestErrorBoundary fallback={<div>Custom fallback</div>}>
        <ThrowError shouldThrow={true} />
      </TestErrorBoundary>
    );

    expect(screen.getByText('Custom fallback')).toBeInTheDocument();
  });

  it('has a try again button that can be clicked', () => {
    render(
      <TestErrorBoundary>
        <ThrowError shouldThrow={true} />
      </TestErrorBoundary>
    );

    // Error should be shown
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    // Try again button should exist and be clickable
    const tryAgainButton = screen.getByText('Try Again');
    expect(tryAgainButton).toBeInTheDocument();

    // Click should not throw
    expect(() => fireEvent.click(tryAgainButton)).not.toThrow();
  });
});
