import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, X, Users, BookOpen, Target, UserCheck } from 'lucide-react';

interface MultiStepInterventionFormProps {
  currentStep: number;
  createForm: any;
  setCreateForm: (form: any) => void;
  formErrors: Record<string, string>;
  setFormErrors: (errors: any) => void;
  selectedMicrocompetencies: any[];
  setSelectedMicrocompetencies: (mcs: any[]) => void;
  selectedStudents: string[];
  setSelectedStudents: (students: string[]) => void;
  availableMicrocompetencies: any[];
  availableTeachers: any[];
  availableStudents: any[];
  addObjective: () => void;
  updateObjective: (index: number, value: string) => void;
  removeObjective: (index: number) => void;
  addPrerequisite: () => void;
  updatePrerequisite: (index: number, value: string) => void;
  removePrerequisite: (index: number) => void;
  addMicrocompetency: (mc: any) => void;
  removeMicrocompetency: (id: string) => void;
  updateMicrocompetencyWeightage: (id: string, weightage: number) => void;
  updateMicrocompetencyMaxScore: (id: string, maxScore: number) => void;
  assignTeacherToMicrocompetency: (mcId: string, teacherId: string) => void;
  setShowStudentSelectionDialog: (show: boolean) => void;
}

export const MultiStepInterventionForm: React.FC<MultiStepInterventionFormProps> = ({
  currentStep,
  createForm,
  setCreateForm,
  formErrors,
  setFormErrors,
  selectedMicrocompetencies,
  availableMicrocompetencies,
  availableTeachers,
  availableStudents,
  selectedStudents,
  setSelectedStudents,
  addObjective,
  updateObjective,
  removeObjective,
  addPrerequisite,
  updatePrerequisite,
  removePrerequisite,
  addMicrocompetency,
  removeMicrocompetency,
  updateMicrocompetencyWeightage,
  updateMicrocompetencyMaxScore,
  assignTeacherToMicrocompetency,
  setShowStudentSelectionDialog,
}) => {
  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Intervention Name *</Label>
          <Input
            id="name"
            placeholder="Enter intervention name"
            value={createForm.name}
            onChange={(e) => {
              setCreateForm(prev => ({ ...prev, name: e.target.value }));
              if (formErrors.name) {
                setFormErrors(prev => ({ ...prev, name: '' }));
              }
            }}
            className={formErrors.name ? 'border-red-500' : ''}
          />
          {formErrors.name && (
            <p className="text-sm text-red-600">{formErrors.name}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description *</Label>
          <Textarea
            id="description"
            placeholder="Describe the intervention program, its goals, and expected outcomes"
            value={createForm.description}
            onChange={(e) => {
              setCreateForm(prev => ({ ...prev, description: e.target.value }));
              if (formErrors.description) {
                setFormErrors(prev => ({ ...prev, description: '' }));
              }
            }}
            rows={4}
            className={formErrors.description ? 'border-red-500' : ''}
          />
          {formErrors.description && (
            <p className="text-sm text-red-600">{formErrors.description}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="startDate">Start Date *</Label>
            <Input
              id="startDate"
              type="date"
              value={createForm.startDate}
              onChange={(e) => {
                setCreateForm(prev => ({ ...prev, startDate: e.target.value }));
                if (formErrors.startDate) {
                  setFormErrors(prev => ({ ...prev, startDate: '' }));
                }
              }}
              className={formErrors.startDate ? 'border-red-500' : ''}
              min={new Date().toISOString().split('T')[0]}
            />
            {formErrors.startDate && (
              <p className="text-sm text-red-600">{formErrors.startDate}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="endDate">End Date *</Label>
            <Input
              id="endDate"
              type="date"
              value={createForm.endDate}
              onChange={(e) => {
                setCreateForm(prev => ({ ...prev, endDate: e.target.value }));
                if (formErrors.endDate) {
                  setFormErrors(prev => ({ ...prev, endDate: '' }));
                }
              }}
              className={formErrors.endDate ? 'border-red-500' : ''}
              min={createForm.startDate || new Date().toISOString().split('T')[0]}
            />
            {formErrors.endDate && (
              <p className="text-sm text-red-600">{formErrors.endDate}</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="maxStudents">Maximum Students *</Label>
          <Input
            id="maxStudents"
            type="number"
            min="1"
            max="1000"
            value={createForm.maxStudents}
            onChange={(e) => {
              const value = parseInt(e.target.value) || 1;
              setCreateForm(prev => ({ ...prev, maxStudents: value }));
              if (formErrors.maxStudents) {
                setFormErrors(prev => ({ ...prev, maxStudents: '' }));
              }
            }}
            className={formErrors.maxStudents ? 'border-red-500' : ''}
          />
          {formErrors.maxStudents && (
            <p className="text-sm text-red-600">{formErrors.maxStudents}</p>
          )}
        </div>
      </div>

      {/* Objectives */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label>Learning Objectives *</Label>
            <p className="text-xs text-gray-500">Define what students will achieve</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addObjective}>
            <Plus className="h-4 w-4 mr-1" />
            Add Objective
          </Button>
        </div>
        {createForm.objectives.map((objective, index) => (
          <div key={index} className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder={`Learning objective ${index + 1}`}
                value={objective}
                onChange={(e) => updateObjective(index, e.target.value)}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => removeObjective(index)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      {/* Prerequisites */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label>Prerequisites (Optional)</Label>
            <p className="text-xs text-gray-500">Skills or knowledge students should have</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addPrerequisite}>
            <Plus className="h-4 w-4 mr-1" />
            Add Prerequisite
          </Button>
        </div>
        {createForm.prerequisites.map((prerequisite, index) => (
          <div key={index} className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder={`Prerequisite ${index + 1}`}
                value={prerequisite}
                onChange={(e) => updatePrerequisite(index, e.target.value)}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => removePrerequisite(index)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Select Microcompetencies</h3>
          <p className="text-sm text-gray-600">Choose the skills to assess in this intervention</p>
        </div>
        <Badge variant="secondary">
          {selectedMicrocompetencies.length} selected
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Available Microcompetencies */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Available Microcompetencies</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-96 overflow-y-auto">
            {availableMicrocompetencies.map((mc) => (
              <div
                key={mc.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
              >
                <div className="flex-1">
                  <div className="font-medium">{mc.name}</div>
                  <div className="text-sm text-gray-600">{mc.quadrant.name}</div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => addMicrocompetency(mc)}
                  disabled={selectedMicrocompetencies.some(selected => selected.id === mc.id)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Selected Microcompetencies */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Selected Microcompetencies</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 max-h-96 overflow-y-auto">
            {selectedMicrocompetencies.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <BookOpen className="h-8 w-8 mx-auto mb-2" />
                <p>No microcompetencies selected</p>
              </div>
            ) : (
              selectedMicrocompetencies.map((mc) => (
                <div key={mc.id} className="p-3 border rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{mc.name}</div>
                      <Badge variant="outline" className="text-xs">
                        {mc.quadrant.name}
                      </Badge>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => removeMicrocompetency(mc.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Weightage (%)</Label>
                      <Input
                        type="number"
                        min="1"
                        max="100"
                        value={mc.weightage}
                        onChange={(e) => updateMicrocompetencyWeightage(mc.id, parseInt(e.target.value) || 1)}
                        className="h-8"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Max Score</Label>
                      <Input
                        type="number"
                        min="1"
                        max="1000"
                        value={mc.maxScore}
                        onChange={(e) => updateMicrocompetencyMaxScore(mc.id, parseInt(e.target.value) || 100)}
                        className="h-8"
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Assign Teachers</h3>
          <p className="text-sm text-gray-600">Assign teachers to microcompetencies for scoring</p>
        </div>
        <Badge variant="secondary">
          {selectedMicrocompetencies.filter(mc => mc.assignedTeacher).length} / {selectedMicrocompetencies.length} assigned
        </Badge>
      </div>

      {selectedMicrocompetencies.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <UserCheck className="h-12 w-12 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Microcompetencies Selected</h3>
          <p>Please go back to Step 2 and select microcompetencies first.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {selectedMicrocompetencies.map((mc) => (
            <Card key={mc.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-medium">{mc.name}</div>
                    <div className="text-sm text-gray-600 flex items-center gap-2">
                      <Badge variant="outline">{mc.quadrant.name}</Badge>
                      <span>Weightage: {mc.weightage}%</span>
                      <span>Max Score: {mc.maxScore}</span>
                    </div>
                  </div>
                  <div className="w-64">
                    <Select
                      value={mc.assignedTeacher || 'none'}
                      onValueChange={(teacherId) => {
                        const actualTeacherId = teacherId === 'none' ? null : teacherId;
                        assignTeacherToMicrocompetency(mc.id, actualTeacherId);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select teacher" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No teacher assigned</SelectItem>
                        {availableTeachers.map((teacher) => (
                          <SelectItem key={teacher.id} value={teacher.id}>
                            {teacher.name} - {teacher.specialization}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Enroll Students</h3>
          <p className="text-sm text-gray-600">Select students to enroll in this intervention</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            {selectedStudents.length} selected
          </Badge>
          <Button onClick={() => setShowStudentSelectionDialog(true)}>
            <Users className="h-4 w-4 mr-2" />
            Select Students
          </Button>
        </div>
      </div>

      {selectedStudents.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Users className="h-12 w-12 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Students Selected</h3>
          <p className="mb-4">Click "Select Students" to choose students for this intervention.</p>
          <Button onClick={() => setShowStudentSelectionDialog(true)}>
            <Users className="h-4 w-4 mr-2" />
            Select Students
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {selectedStudents.map((studentId) => {
              const student = availableStudents.find(s => s.id === studentId);
              if (!student) return null;

              return (
                <Card key={studentId}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{student.name}</div>
                        <div className="text-sm text-gray-600">{student.registration_no}</div>
                        <div className="text-xs text-gray-500">{student.course}</div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedStudents(prev => prev.filter(id => id !== studentId))}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Summary */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-base text-blue-900">Intervention Summary</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="font-medium">Intervention:</span> {createForm.name}
            </div>
            <div>
              <span className="font-medium">Duration:</span> {createForm.startDate} to {createForm.endDate}
            </div>
            <div>
              <span className="font-medium">Microcompetencies:</span> {selectedMicrocompetencies.length}
            </div>
            <div>
              <span className="font-medium">Teachers Assigned:</span> {selectedMicrocompetencies.filter(mc => mc.assignedTeacher).length}
            </div>
            <div>
              <span className="font-medium">Students Enrolled:</span> {selectedStudents.length}
            </div>
            <div>
              <span className="font-medium">Max Capacity:</span> {createForm.maxStudents}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  switch (currentStep) {
    case 1:
      return renderStep1();
    case 2:
      return renderStep2();
    case 3:
      return renderStep3();
    case 4:
      return renderStep4();
    default:
      return renderStep1();
  }
};
