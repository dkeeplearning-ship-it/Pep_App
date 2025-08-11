import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ChevronRight, TrendingDown, AlertTriangle, ArrowRight } from 'lucide-react';
import { Student, QuadrantScore, Component } from '@/types/api';

interface AreasForImprovementProps {
  studentData: Student;
}

const AreasForImprovement: React.FC<AreasForImprovementProps> = ({ studentData }) => {
  // Get the current term data
  const currentTerm = studentData.terms.find(term => term.termId === studentData.currentTerm) || studentData.terms[0];

  // Find components that need improvement across all quadrants
  const improvementAreas: {
    quadrantId: string;
    quadrantName: string;
    componentId: string;
    componentName: string;
    score: number;
    maxScore: number;
    status?: string;
    priority: 'high' | 'medium' | 'low';
  }[] = [];

  // Helper function to determine priority
  const determinePriority = (component: Component, quadrant: QuadrantData): 'high' | 'medium' | 'low' => {
    if (component.status === 'Deteriorate') return 'high';
    if (component.score / component.maxScore < 0.6) return 'high';
    if (component.score / component.maxScore < 0.7) return 'medium';
    return 'low';
  };

  // Collect improvement areas from all quadrants
  currentTerm.quadrants.forEach(quadrant => {
    // Check if the quadrant has eligibility issues
    if (quadrant.eligibility === 'Not Eligible') {
      improvementAreas.push({
        quadrantId: quadrant.id,
        quadrantName: quadrant.name,
        componentId: 'attendance',
        componentName: 'Attendance',
        score: quadrant.attendance || 0,
        maxScore: 100,
        status: 'Attendance Shortage',
        priority: 'high'
      });
    }

    // Check individual components
    quadrant.components.forEach(component => {
      if (
        component.status === 'Progress' ||
        component.status === 'Deteriorate' ||
        (component.score / component.maxScore < 0.7)
      ) {
        improvementAreas.push({
          quadrantId: quadrant.id,
          quadrantName: quadrant.name,
          componentId: component.id,
          componentName: component.name,
          score: component.score,
          maxScore: component.maxScore,
          status: component.status,
          priority: determinePriority(component, quadrant)
        });
      }
    });
  });

  // Sort by priority (high to low)
  improvementAreas.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  // Limit to top 5 areas
  const topImprovementAreas = improvementAreas.slice(0, 5);

  // Generate improvement recommendations
  const getRecommendation = (area: typeof improvementAreas[0]): string => {
    if (area.status === 'Attendance Shortage') {
      return `Improve your attendance in ${area.quadrantName} activities to meet the minimum 80% requirement.`;
    }

    if (area.quadrantId === 'persona') {
      if (area.componentName.includes('Critical Thinking')) {
        return 'Practice analytical exercises and case studies to improve critical thinking skills.';
      }
      if (area.componentName.includes('Communication')) {
        return 'Participate more actively in class discussions and presentation opportunities.';
      }
      if (area.componentName.includes('Leadership')) {
        return 'Take initiative in group activities and seek leadership roles in projects.';
      }
      if (area.componentName.includes('Teamwork')) {
        return 'Focus on collaborative skills and effective contribution in team settings.';
      }
      if (area.componentName.includes('Negotiation')) {
        return 'Practice conflict resolution and persuasive communication techniques.';
      }
      if (area.componentName.includes('ESPA')) {
        return 'Dedicate more time to ESPA preparation and practice tests.';
      }
    }

    if (area.quadrantId === 'wellness') {
      return `Increase practice and training for ${area.componentName.toLowerCase()} to improve your physical fitness.`;
    }

    if (area.quadrantId === 'behavior') {
      if (area.componentName.includes('Prepares')) {
        return 'Develop a consistent pre-class preparation routine to be better prepared.';
      }
      if (area.componentName.includes('Participates')) {
        return 'Set a goal to contribute at least once in every class discussion.';
      }
      if (area.componentName.includes('Manners')) {
        return 'Focus on professional etiquette and respectful interactions with peers and faculty.';
      }
      if (area.componentName.includes('Time')) {
        return 'Improve punctuality by planning to arrive 10 minutes before scheduled activities.';
      }
      if (area.componentName.includes('Assignments')) {
        return 'Allocate more time for assignment completion and seek feedback before submission.';
      }
    }

    if (area.quadrantId === 'discipline') {
      if (area.componentName.includes('Attendance')) {
        return 'Create a consistent schedule and set reminders to improve attendance.';
      }
      if (area.componentName.includes('Regularity')) {
        return 'Establish a routine for academic activities to improve consistency.';
      }
      if (area.componentName.includes('Preparedness')) {
        return 'Develop a checklist for materials and preparation before each class.';
      }
      if (area.componentName.includes('Deadlines')) {
        return 'Use a planner or digital calendar to track and meet all deadlines.';
      }
      if (area.componentName.includes('Participation')) {
        return 'Set goals for active participation in all academic and extracurricular activities.';
      }
    }

    return `Focus on improving your ${area.componentName.toLowerCase()} skills to reach the optimal score.`;
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex justify-between items-center">
          <span>Areas for Improvement</span>
          {improvementAreas.length > 0 && (
            <Badge variant={improvementAreas[0].priority === 'high' ? 'destructive' : 'outline'}>
              {improvementAreas.length} {improvementAreas.length === 1 ? 'Area' : 'Areas'} Identified
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {topImprovementAreas.length > 0 ? (
          <div className="space-y-4">
            {topImprovementAreas.map((area, index) => (
              <div key={`${area.quadrantId}-${area.componentId}`} className="flex items-start gap-3">
                <div className="mt-0.5">
                  {area.priority === 'high' ? (
                    <TrendingDown className="h-5 w-5 text-red-500" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <h3 className="font-medium text-sm">
                      {area.quadrantName}: {area.componentName}
                    </h3>
                    <Badge variant={area.priority === 'high' ? 'destructive' : area.priority === 'medium' ? 'secondary' : 'outline'} className="text-xs">
                      {area.score}/{area.maxScore}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{getRecommendation(area)}</p>
                </div>
              </div>
            ))}

            <div className="grid grid-cols-2 gap-2 mt-2">
              <Button variant="outline" size="sm" asChild>
                <Link to={`/student/quadrant/${topImprovementAreas[0].quadrantId}`} className="flex items-center justify-center">
                  View Quadrant
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button variant="default" size="sm" asChild>
                <Link to="/student/improvement" className="flex items-center justify-center">
                  Full Improvement Plan
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center">
            <p className="text-green-600 font-medium">Great job! No critical areas for improvement identified.</p>
            <p className="text-sm text-muted-foreground mt-1">Continue maintaining your excellent performance.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AreasForImprovement;
