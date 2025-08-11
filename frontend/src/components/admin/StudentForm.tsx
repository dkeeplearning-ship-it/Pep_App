import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { adminAPI } from "@/lib/api";
import { FormValidator } from "@/utils/formValidation";
import { ErrorHandler, FormErrors } from "@/utils/errorHandling";

interface Student {
  id?: string;
  user_id?: string;
  registration_no: string;
  name: string;
  course: string;
  batch_id: string;
  section_id: string;
  house_id?: string;
  gender: string;
  phone: string;
  user?: {
    email: string;
    username: string;
  };
}

interface ReferenceData {
  batches: Array<{ id: string; name: string; year: string }>;
  sections: Array<{ id: string; name: string }>;
  houses: Array<{ id: string; name: string; color: string }>;
  courses: string[];
  genderOptions: string[];
}

interface StudentFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (studentData: any) => Promise<void>;
  student?: Student | null;
  referenceData: ReferenceData;
  isEditing?: boolean;
}

const StudentForm: React.FC<StudentFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  student,
  referenceData,
  isEditing = false
}) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    username: '',
    password: '',
    registrationNo: '',
    course: '',
    batchId: '',
    sectionId: '',
    houseId: '',
    gender: '',
    phone: ''
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form data when student prop changes
  useEffect(() => {
    if (student && isEditing) {
      const [firstName, ...lastNameParts] = student.name.split(' ');
      setFormData({
        firstName: firstName || '',
        lastName: lastNameParts.join(' ') || '',
        email: student.user?.email || '',
        username: student.user?.username || '',
        password: '', // Never pre-fill password
        registrationNo: student.registration_no || '',
        course: student.course || '',
        batchId: student.batch_id || '',
        sectionId: student.section_id || '',
        houseId: student.house_id || '',
        gender: student.gender || '',
        phone: student.phone || ''
      });
    } else {
      // Reset form for new student
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        username: '',
        password: '',
        registrationNo: '',
        course: '',
        batchId: '',
        sectionId: '',
        houseId: '',
        gender: '',
        phone: ''
      });
    }
    setErrors({});
  }, [student, isEditing, isOpen]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Required field validation
    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    if (!formData.username.trim()) newErrors.username = 'Username is required';
    if (!isEditing && !formData.password.trim()) newErrors.password = 'Password is required';
    if (!formData.registrationNo.trim()) newErrors.registrationNo = 'Registration number is required';
    if (!formData.course) newErrors.course = 'Course is required';
    if (!formData.batchId) newErrors.batchId = 'Batch is required';
    if (!formData.sectionId) newErrors.sectionId = 'Section is required';
    if (!formData.gender) newErrors.gender = 'Gender is required';

    // Email validation
    if (formData.email && !FormValidator.isValidEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Phone validation
    if (formData.phone && !FormValidator.isValidPhone(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    // Password validation (only for new students)
    if (!isEditing && formData.password && !FormValidator.isValidPassword(formData.password)) {
      newErrors.password = 'Password must be at least 8 characters long';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the form errors before submitting');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      onClose();
      toast.success(isEditing ? 'Student updated successfully' : 'Student created successfully');
    } catch (error) {
      console.error('Form submission error:', error);
      const errorMessage = ErrorHandler.getErrorMessage(error);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Student' : 'Add New Student'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                className={errors.firstName ? 'border-red-500' : ''}
              />
              {errors.firstName && (
                <p className="text-sm text-red-500 mt-1">{errors.firstName}</p>
              )}
            </div>
            
            <div>
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                className={errors.lastName ? 'border-red-500' : ''}
              />
              {errors.lastName && (
                <p className="text-sm text-red-500 mt-1">{errors.lastName}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className={errors.email ? 'border-red-500' : ''}
              />
              {errors.email && (
                <p className="text-sm text-red-500 mt-1">{errors.email}</p>
              )}
            </div>
            
            <div>
              <Label htmlFor="username">Username *</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => handleInputChange('username', e.target.value)}
                className={errors.username ? 'border-red-500' : ''}
              />
              {errors.username && (
                <p className="text-sm text-red-500 mt-1">{errors.username}</p>
              )}
            </div>
          </div>

          {!isEditing && (
            <div>
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                className={errors.password ? 'border-red-500' : ''}
              />
              {errors.password && (
                <p className="text-sm text-red-500 mt-1">{errors.password}</p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="registrationNo">Registration Number *</Label>
              <Input
                id="registrationNo"
                value={formData.registrationNo}
                onChange={(e) => handleInputChange('registrationNo', e.target.value)}
                className={errors.registrationNo ? 'border-red-500' : ''}
              />
              {errors.registrationNo && (
                <p className="text-sm text-red-500 mt-1">{errors.registrationNo}</p>
              )}
            </div>
            
            <div>
              <Label htmlFor="course">Course *</Label>
              <Select value={formData.course} onValueChange={(value) => handleInputChange('course', value)}>
                <SelectTrigger className={errors.course ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select course" />
                </SelectTrigger>
                <SelectContent>
                  {referenceData.courses.map((course) => (
                    <SelectItem key={course} value={course}>
                      {course}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.course && (
                <p className="text-sm text-red-500 mt-1">{errors.course}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="batch">Batch *</Label>
              <Select value={formData.batchId} onValueChange={(value) => handleInputChange('batchId', value)}>
                <SelectTrigger className={errors.batchId ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select batch" />
                </SelectTrigger>
                <SelectContent>
                  {referenceData.batches.map((batch) => (
                    <SelectItem key={batch.id} value={batch.id}>
                      {batch.name} ({batch.year})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.batchId && (
                <p className="text-sm text-red-500 mt-1">{errors.batchId}</p>
              )}
            </div>
            
            <div>
              <Label htmlFor="section">Section *</Label>
              <Select value={formData.sectionId} onValueChange={(value) => handleInputChange('sectionId', value)}>
                <SelectTrigger className={errors.sectionId ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select section" />
                </SelectTrigger>
                <SelectContent>
                  {referenceData.sections.map((section) => (
                    <SelectItem key={section.id} value={section.id}>
                      {section.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.sectionId && (
                <p className="text-sm text-red-500 mt-1">{errors.sectionId}</p>
              )}
            </div>
            
            <div>
              <Label htmlFor="house">House</Label>
              <Select value={formData.houseId} onValueChange={(value) => handleInputChange('houseId', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select house (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {referenceData.houses.map((house) => (
                    <SelectItem key={house.id} value={house.id}>
                      {house.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="gender">Gender *</Label>
              <Select value={formData.gender} onValueChange={(value) => handleInputChange('gender', value)}>
                <SelectTrigger className={errors.gender ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  {referenceData.genderOptions.map((gender) => (
                    <SelectItem key={gender} value={gender}>
                      {gender}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.gender && (
                <p className="text-sm text-red-500 mt-1">{errors.gender}</p>
              )}
            </div>
            
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                className={errors.phone ? 'border-red-500' : ''}
                placeholder="Enter phone number"
              />
              {errors.phone && (
                <p className="text-sm text-red-500 mt-1">{errors.phone}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : (isEditing ? 'Update Student' : 'Create Student')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default StudentForm;
