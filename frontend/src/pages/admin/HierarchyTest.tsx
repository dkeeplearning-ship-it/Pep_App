import React from 'react';
import HierarchicalWeightageManager from '@/components/admin/HierarchicalWeightageManager';

// Mock data for testing
const mockConfig = {
  id: 'test-config-1',
  config_name: 'Test Configuration - Festive Term 2025',
  batch_id: 'batch-1',
  term_id: 'term-1',
  is_active: true,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  batches: {
    id: 'batch-1',
    name: 'Batch 2025',
    year: 2025,
    is_active: true
  },
  terms: {
    id: 'term-1',
    name: 'Festive Term',
    start_date: '2025-01-01',
    end_date: '2025-06-30',
    is_active: true
  }
};

const HierarchyTest: React.FC = () => {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Hierarchical Weightage Manager Test</h1>
        <p className="text-muted-foreground">
          Testing the new hierarchical interface for managing PEP weightages
        </p>
      </div>
      
      <HierarchicalWeightageManager
        selectedConfig={mockConfig}
        onConfigUpdate={() => {
          console.log('Config updated');
        }}
      />
    </div>
  );
};

export default HierarchyTest;
