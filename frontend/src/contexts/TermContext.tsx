import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { termAPI } from '@/lib/api';

interface Term {
  id: string;
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  is_current: boolean;
  academic_year: string;
  created_at: string;
}

interface TermContextType {
  currentTerm: Term | null;
  availableTerms: Term[];
  selectedTerm: Term | null;
  isLoading: boolean;
  error: string | null;
  setSelectedTerm: (term: Term | null) => void;
  refreshTerms: () => Promise<void>;
  setCurrentTerm: (termId: string) => Promise<void>;
}

const TermContext = createContext<TermContextType | undefined>(undefined);

interface TermProviderProps {
  children: ReactNode;
}

export const TermProvider: React.FC<TermProviderProps> = ({ children }) => {
  const [currentTerm, setCurrentTermState] = useState<Term | null>(null);
  const [availableTerms, setAvailableTerms] = useState<Term[]>([]);
  const [selectedTerm, setSelectedTerm] = useState<Term | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all terms
  const fetchTerms = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await termAPI.getAllTerms();
      if (response.success) {
        setAvailableTerms(response.data);
        
        // Find current term
        const current = response.data.find((term: Term) => term.is_current);
        if (current) {
          setCurrentTermState(current);
          // Set selected term to current if none selected
          if (!selectedTerm) {
            setSelectedTerm(current);
          }
        }
      } else {
        setError('Failed to fetch terms');
      }
    } catch (err) {
      console.error('Error fetching terms:', err);
      setError('Failed to fetch terms');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch current term specifically
  const fetchCurrentTerm = async () => {
    try {
      const response = await termAPI.getCurrentTerm();
      if (response.success) {
        setCurrentTermState(response.data);
        // Set selected term to current if none selected
        if (!selectedTerm) {
          setSelectedTerm(response.data);
        }
      }
    } catch (err) {
      console.error('Error fetching current term:', err);
    }
  };

  // Set current term (admin function)
  const setCurrentTerm = async (termId: string) => {
    try {
      setIsLoading(true);
      const response = await termAPI.setCurrentTerm(termId);
      if (response.success) {
        await refreshTerms(); // Refresh all terms
        return;
      }
      throw new Error('Failed to set current term');
    } catch (err) {
      console.error('Error setting current term:', err);
      setError('Failed to set current term');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh terms
  const refreshTerms = async () => {
    await fetchTerms();
  };

  // Initialize on mount
  useEffect(() => {
    fetchTerms();
  }, []);

  // Update selected term when current term changes
  useEffect(() => {
    if (currentTerm && !selectedTerm) {
      setSelectedTerm(currentTerm);
    }
  }, [currentTerm, selectedTerm]);

  const value: TermContextType = {
    currentTerm,
    availableTerms,
    selectedTerm,
    isLoading,
    error,
    setSelectedTerm,
    refreshTerms,
    setCurrentTerm,
  };

  return (
    <TermContext.Provider value={value}>
      {children}
    </TermContext.Provider>
  );
};

export const useTerm = (): TermContextType => {
  const context = useContext(TermContext);
  if (context === undefined) {
    throw new Error('useTerm must be used within a TermProvider');
  }
  return context;
};

export default TermContext;
