const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  upload,
  uploadSingleFile,
  uploadMultipleFiles,
  serveFile,
  deleteFile,
  importExcelData
} = require('../controllers/uploadController');

/**
 * @route   POST /api/v1/uploads/single
 * @desc    Upload a single file
 * @access  Authenticated users
 * @body    FormData with 'file' field
 */
router.post('/single',
  authenticateToken,
  upload.single('file'),
  uploadSingleFile
);

/**
 * @route   POST /api/v1/uploads/multiple
 * @desc    Upload multiple files
 * @access  Authenticated users
 * @body    FormData with 'files' field (array)
 */
router.post('/multiple',
  authenticateToken,
  upload.array('files', 5), // Maximum 5 files
  uploadMultipleFiles
);

/**
 * @route   GET /api/v1/uploads/files/:filename
 * @desc    Serve/download uploaded file
 * @access  Public (files are served directly)
 * @params  filename: the filename to serve
 */
router.get('/files/:filename', serveFile);

/**
 * @route   DELETE /api/v1/uploads/files/:filename
 * @desc    Delete uploaded file
 * @access  Authenticated users (admin or file owner)
 * @params  filename: the filename to delete
 */
router.delete('/files/:filename',
  authenticateToken,
  deleteFile
);

/**
 * @route   POST /api/v1/uploads/excel-import
 * @desc    Import data from Excel file
 * @access  Admin only
 * @body    FormData with 'file' field and 'importType' field
 */
router.post('/excel-import',
  authenticateToken,
  upload.single('file'),
  importExcelData
);

module.exports = router;
