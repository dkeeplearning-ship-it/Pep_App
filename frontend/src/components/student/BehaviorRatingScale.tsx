import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const BehaviorRatingScale: React.FC = () => {
  const ratingScales = [
    {
      rating: 5,
      description: 'Consistently demonstrates exemplary behavior in all situations',
      examples: 'Always prepared, actively participates, shows excellent manners, always punctual and well-groomed, submits outstanding assignments'
    },
    {
      rating: 4,
      description: 'Frequently demonstrates positive behavior with few exceptions',
      examples: 'Usually prepared, regularly participates, shows good manners, typically punctual and well-groomed, submits good quality assignments'
    },
    {
      rating: 3,
      description: 'Sometimes demonstrates expected behavior',
      examples: 'Sometimes prepared, occasionally participates, shows acceptable manners, sometimes punctual and well-groomed, submits average quality assignments'
    },
    {
      rating: 2,
      description: 'Rarely demonstrates expected behavior',
      examples: 'Rarely prepared, seldom participates, shows poor manners, often late or poorly groomed, submits low quality assignments'
    },
    {
      rating: 1,
      description: 'Never or almost never demonstrates expected behavior',
      examples: 'Never prepared, does not participate, shows unacceptable manners, consistently late or inappropriately groomed, submits unacceptable assignments'
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Behavior Rating Scale</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Rating</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Examples</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ratingScales.map((scale) => (
              <TableRow key={scale.rating}>
                <TableCell className="font-medium">{scale.rating}</TableCell>
                <TableCell>{scale.description}</TableCell>
                <TableCell className="text-sm">{scale.examples}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default BehaviorRatingScale;
