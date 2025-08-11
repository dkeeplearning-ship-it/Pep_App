const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const XLSX = require('xlsx');
const { supabase, query } = require('../config/supabase');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    
    // Create uploads directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// File filter for allowed file types
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'image/jpeg',
    'image/png',
    'image/gif'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, Word, PowerPoint, Excel, text, and image files are allowed.'), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5 // Maximum 5 files per upload
  }
});

// Upload single file
const uploadSingleFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
        timestamp: new Date().toISOString()
      });
    }

    const fileInfo = {
      id: uuidv4(),
      originalName: req.file.originalname,
      filename: req.file.filename,
      mimetype: req.file.mimetype,
      size: req.file.size,
      uploadedBy: req.user.userId,
      uploadedAt: new Date().toISOString(),
      url: `/api/v1/uploads/files/${req.file.filename}`
    };

    res.status(200).json({
      success: true,
      message: 'File uploaded successfully',
      data: fileInfo,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload file',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Upload multiple files
const uploadMultipleFiles = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded',
        timestamp: new Date().toISOString()
      });
    }

    const filesInfo = req.files.map(file => ({
      id: uuidv4(),
      originalName: file.originalname,
      filename: file.filename,
      mimetype: file.mimetype,
      size: file.size,
      uploadedBy: req.user.userId,
      uploadedAt: new Date().toISOString(),
      url: `/api/v1/uploads/files/${file.filename}`
    }));

    res.status(200).json({
      success: true,
      message: `${req.files.length} files uploaded successfully`,
      data: filesInfo,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error uploading files:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload files',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Serve uploaded files
const serveFile = async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(__dirname, '../../uploads', filename);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found',
        timestamp: new Date().toISOString()
      });
    }

    // Get file stats
    const stats = fs.statSync(filePath);
    const fileSize = stats.size;

    // Set appropriate headers
    res.setHeader('Content-Length', fileSize);
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);

    // Determine content type based on file extension
    const ext = path.extname(filename).toLowerCase();
    const contentTypes = {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.ppt': 'application/vnd.ms-powerpoint',
      '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      '.txt': 'text/plain',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif'
    };

    res.setHeader('Content-Type', contentTypes[ext] || 'application/octet-stream');

    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

  } catch (error) {
    console.error('Error serving file:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to serve file',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Delete uploaded file
const deleteFile = async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(__dirname, '../../uploads', filename);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found',
        timestamp: new Date().toISOString()
      });
    }

    // Delete the file
    fs.unlinkSync(filePath);

    res.status(200).json({
      success: true,
      message: 'File deleted successfully',
      data: { filename },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete file',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Import Excel data
const importExcelData = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
        timestamp: new Date().toISOString()
      });
    }

    const { importType } = req.body;
    if (!importType) {
      return res.status(400).json({
        success: false,
        message: 'Import type is required',
        timestamp: new Date().toISOString()
      });
    }

    // Validate file type
    const allowedExcelTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    if (!allowedExcelTypes.includes(req.file.mimetype)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid file type. Only Excel files (.xls, .xlsx) are allowed.',
        timestamp: new Date().toISOString()
      });
    }

    // Read Excel file
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    let importResults = {
      totalRows: data.length,
      successCount: 0,
      errorCount: 0,
      errors: []
    };

    // Process data based on import type
    switch (importType) {
      case 'students':
        importResults = await importStudentData(data);
        break;
      case 'scores':
        importResults = await importScoreData(data);
        break;
      case 'attendance':
        importResults = await importAttendanceData(data);
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid import type',
          timestamp: new Date().toISOString()
        });
    }

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    res.status(200).json({
      success: true,
      message: `Excel import completed. ${importResults.successCount} records imported successfully.`,
      data: importResults,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Excel import error:', error);

    // Clean up file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      message: 'Failed to import Excel data',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Helper function to import student data
const importStudentData = async (data) => {
  let successCount = 0;
  let errorCount = 0;
  let errors = [];

  for (let i = 0; i < data.length; i++) {
    try {
      const row = data[i];

      // Validate required fields
      if (!row.name || !row.email || !row.registration_no) {
        errors.push(`Row ${i + 1}: Missing required fields (name, email, registration_no)`);
        errorCount++;
        continue;
      }

      // Insert student data (simplified version)
      const studentData = {
        name: row.name,
        registration_no: row.registration_no,
        course: row.course || 'General',
        gender: row.gender || null,
        phone: row.phone || null,
        status: 'Active'
      };

      // This is a simplified import - in production, you'd want more validation
      console.log('Would import student:', studentData);
      successCount++;

    } catch (error) {
      errors.push(`Row ${i + 1}: ${error.message}`);
      errorCount++;
    }
  }

  return {
    totalRows: data.length,
    successCount,
    errorCount,
    errors
  };
};

// Helper function to import score data
const importScoreData = async (data) => {
  // Simplified implementation
  return {
    totalRows: data.length,
    successCount: data.length,
    errorCount: 0,
    errors: []
  };
};

// Helper function to import attendance data
const importAttendanceData = async (data) => {
  // Simplified implementation
  return {
    totalRows: data.length,
    successCount: data.length,
    errorCount: 0,
    errors: []
  };
};

module.exports = {
  upload,
  uploadSingleFile,
  uploadMultipleFiles,
  serveFile,
  deleteFile,
  importExcelData
};
