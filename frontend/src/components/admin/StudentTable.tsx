import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Edit, Trash2 } from "lucide-react";
import StatusBadge, { StatusType } from "@/components/common/StatusBadge";

interface Student {
  id: string;
  user_id: string;
  registration_no: string;
  name: string;
  course: string;
  batch_id: string;
  section_id: string;
  house_id?: string;
  gender: string;
  phone: string;
  preferences: any;
  overall_score: number;
  grade: string;
  status: string;
  current_term: string;
  created_at: string;
  updated_at: string;
  user?: {
    email: string;
    username: string;
  };
  batch?: {
    name: string;
  };
  section?: {
    name: string;
  };
  house?: {
    name: string;
    color: string;
  };
}

interface StudentTableProps {
  students: Student[];
  onViewStudent: (student: Student) => void;
  onEditStudent: (student: Student) => void;
  onDeleteStudent: (student: Student) => void;
  loading?: boolean;
}

const StudentTable: React.FC<StudentTableProps> = ({
  students,
  onViewStudent,
  onEditStudent,
  onDeleteStudent,
  loading = false
}) => {
  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No students found matching your criteria.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b">
            <th className="text-left p-3 font-medium">Student</th>
            <th className="text-left p-3 font-medium">Registration</th>
            <th className="text-left p-3 font-medium">Course</th>
            <th className="text-left p-3 font-medium">Batch</th>
            <th className="text-left p-3 font-medium">Section</th>
            <th className="text-left p-3 font-medium">Score</th>
            <th className="text-left p-3 font-medium">Grade</th>
            <th className="text-left p-3 font-medium">Status</th>
            <th className="text-left p-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {students.map((student) => (
            <tr key={student.id} className="border-b hover:bg-muted/50">
              <td className="p-3">
                <div>
                  <div className="font-medium">{student.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {student.user?.email}
                  </div>
                </div>
              </td>
              <td className="p-3">
                <Badge variant="outline">{student.registration_no}</Badge>
              </td>
              <td className="p-3">{student.course}</td>
              <td className="p-3">
                {student.batch?.name || 'N/A'}
              </td>
              <td className="p-3">
                {student.section?.name || 'N/A'}
              </td>
              <td className="p-3">
                <div className="font-medium">{student.overall_score}%</div>
              </td>
              <td className="p-3">
                <Badge 
                  variant={student.grade === 'A' ? 'default' : 
                          student.grade === 'B' ? 'secondary' : 
                          student.grade === 'C' ? 'outline' : 'destructive'}
                >
                  {student.grade}
                </Badge>
              </td>
              <td className="p-3">
                <StatusBadge status={student.status as StatusType} />
              </td>
              <td className="p-3">
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onViewStudent(student)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEditStudent(student)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDeleteStudent(student)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default StudentTable;
