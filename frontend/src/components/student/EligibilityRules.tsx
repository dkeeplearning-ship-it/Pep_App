import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { GRADING_SCALE, QUADRANT_WEIGHTAGE } from '@/utils/gradeUtils';

const EligibilityRules: React.FC = () => {
  const eligibilityRules = [
    {
      quadrant: 'Persona',
      weightage: `${QUADRANT_WEIGHTAGE.Persona}%`,
      attendanceRequired: '80%',
      otherRequirements: 'Completion of all SHL competency assessments and Professional Readiness components'
    },
    {
      quadrant: 'Wellness',
      weightage: `${QUADRANT_WEIGHTAGE.Wellness}%`,
      attendanceRequired: '80%',
      otherRequirements: 'Participation in all fitness tests and wellness activities'
    },
    {
      quadrant: 'Behavior',
      weightage: `${QUADRANT_WEIGHTAGE.Behavior}%`,
      attendanceRequired: '80%',
      otherRequirements: 'Minimum score of 2 in each behavior component'
    },
    {
      quadrant: 'Discipline',
      weightage: `${QUADRANT_WEIGHTAGE.Discipline}%`,
      attendanceRequired: '80%',
      otherRequirements: 'No disciplinary actions or violations of code of conduct'
    }
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Eligibility Rules</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quadrant</TableHead>
                <TableHead>Weightage</TableHead>
                <TableHead>Attendance Required</TableHead>
                <TableHead>Other Requirements</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {eligibilityRules.map((rule) => (
                <TableRow key={rule.quadrant}>
                  <TableCell className="font-medium">{rule.quadrant}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{rule.weightage}</Badge>
                  </TableCell>
                  <TableCell>{rule.attendanceRequired}</TableCell>
                  <TableCell>{rule.otherRequirements}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Grading Scale</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Grade</TableHead>
                <TableHead>Score Range</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {GRADING_SCALE.map((grade) => (
                <TableRow key={grade.grade}>
                  <TableCell>
                    <Badge variant={
                      grade.grade === 'A+' ? "default" :
                      grade.grade === 'A' ? "secondary" :
                      grade.grade === 'B' ? "outline" :
                      ['D', 'E', 'IC', 'NC'].includes(grade.grade) ? "destructive" :
                      "outline"
                    }>
                      {grade.grade}
                    </Badge>
                  </TableCell>
                  <TableCell>{grade.range}</TableCell>
                  <TableCell>{grade.description}</TableCell>
                  <TableCell>
                    <Badge variant={
                      grade.status === 'Cleared' ? "default" :
                      grade.status === 'Not Cleared' ? "destructive" :
                      "secondary"
                    }>
                      {grade.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Attendance Policy</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p>
              <strong>Minimum Attendance Requirement:</strong> 80% attendance is mandatory for each quadrant.
            </p>
            <p>
              <strong>Attendance Shortage:</strong> Students with attendance below 80% in any quadrant will be marked as "Not Eligible" for that quadrant.
            </p>
            <p>
              <strong>Wellness Attendance:</strong> Special attention is given to wellness activities attendance, which is tracked separately.
            </p>
            <p>
              <strong>Make-up Sessions:</strong> Limited make-up sessions may be available for students with valid reasons for absence.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EligibilityRules;
