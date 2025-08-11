import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import EligibilityRules from '@/components/student/EligibilityRules';

const EligibilityPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/student")}
          className="mr-2"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Eligibility & Grading Rules</h1>
          <p className="text-muted-foreground">
            Understanding the PEP Score eligibility criteria and grading system
          </p>
        </div>
      </div>

      <EligibilityRules />
    </div>
  );
};

export default EligibilityPage;
