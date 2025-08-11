// Student data validation
const validateStudentData = (data, isUpdate = false) => {
  const errors = {};

  // Required fields for both create and update
  if (!isUpdate) {
    if (!data.email) errors.email = 'Email is required';
    if (!data.password) errors.password = 'Password is required';
    if (!data.firstName) errors.firstName = 'First name is required';
    if (!data.lastName) errors.lastName = 'Last name is required';
    if (!data.batchId) errors.batchId = 'Batch is required';
    if (!data.sectionId) errors.sectionId = 'Section is required';
  }

  // Email validation
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.email = 'Invalid email format';
  }

  // Password validation (only for create)
  if (!isUpdate && data.password && data.password.length < 8) {
    errors.password = 'Password must be at least 8 characters long';
  }

  // Name validation
  if (data.firstName && data.firstName.length < 2) {
    errors.firstName = 'First name must be at least 2 characters long';
  }
  if (data.lastName && data.lastName.length < 2) {
    errors.lastName = 'Last name must be at least 2 characters long';
  }

  // Optional fields validation
  if (data.phone && !/^\+?[\d\s-]{10,}$/.test(data.phone)) {
    errors.phone = 'Invalid phone number format';
  }

  if (data.dateOfBirth && !isValidDate(data.dateOfBirth)) {
    errors.dateOfBirth = 'Invalid date format';
  }

  return Object.keys(errors).length > 0 ? errors : null;
};

// Teacher data validation
const validateTeacherData = (data, isUpdate = false) => {
  const errors = {};

  // Required fields for both create and update
  if (!isUpdate) {
    if (!data.email) errors.email = 'Email is required';
    if (!data.password) errors.password = 'Password is required';
    if (!data.firstName) errors.firstName = 'First name is required';
    if (!data.lastName) errors.lastName = 'Last name is required';
    if (!data.qualification) errors.qualification = 'Qualification is required';
    if (!data.specialization) errors.specialization = 'Specialization is required';
  }

  // Email validation
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.email = 'Invalid email format';
  }

  // Password validation (only for create)
  if (!isUpdate && data.password && data.password.length < 8) {
    errors.password = 'Password must be at least 8 characters long';
  }

  // Name validation
  if (data.firstName && data.firstName.length < 2) {
    errors.firstName = 'First name must be at least 2 characters long';
  }
  if (data.lastName && data.lastName.length < 2) {
    errors.lastName = 'Last name must be at least 2 characters long';
  }

  // Optional fields validation
  if (data.phone && !/^\+?[\d\s-]{10,}$/.test(data.phone)) {
    errors.phone = 'Invalid phone number format';
  }

  if (data.dateOfBirth && !isValidDate(data.dateOfBirth)) {
    errors.dateOfBirth = 'Invalid date format';
  }

  if (data.experience && (isNaN(data.experience) || data.experience < 0)) {
    errors.experience = 'Experience must be a positive number';
  }

  return Object.keys(errors).length > 0 ? errors : null;
};

// Helper function to validate date format
const isValidDate = (dateString) => {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
};

module.exports = {
  validateStudentData,
  validateTeacherData
}; 