import { studentAPI, teacherAPI, adminAPI, interventionAPI, unifiedScoreAPI } from '@/lib/api';

interface TestResult {
  endpoint: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  responseTime?: number;
  data?: any;
}

interface ApiTestSuite {
  category: string;
  tests: TestResult[];
}

export class ApiTester {
  private results: ApiTestSuite[] = [];

  async runComprehensiveTest(): Promise<ApiTestSuite[]> {
    console.log('🧪 Starting comprehensive API test suite...');
    
    this.results = [];
    
    // Test Student APIs
    await this.testStudentApis();
    
    // Test Teacher APIs
    await this.testTeacherApis();
    
    // Test Admin APIs
    await this.testAdminApis();
    
    // Test Unified Score APIs
    await this.testUnifiedScoreApis();
    
    // Test Intervention APIs
    await this.testInterventionApis();
    
    console.log('✅ Comprehensive API test suite completed');
    return this.results;
  }

  private async testStudentApis() {
    const tests: TestResult[] = [];
    const category = 'Student APIs';
    
    try {
      // Test getCurrentStudent
      const startTime = performance.now();
      const currentStudent = await studentAPI.getCurrentStudent();
      const responseTime = performance.now() - startTime;
      
      tests.push({
        endpoint: 'GET /api/v1/students/current',
        status: 'success',
        message: 'Current student retrieved successfully',
        responseTime,
        data: { studentId: currentStudent.data.id }
      });

      const studentId = currentStudent.data.id;
      
      // Test getStudentPerformance
      try {
        const performance = await studentAPI.getStudentPerformance(studentId, '62cbc472-9175-4c95-b9f7-3fb0e2abca2f', true);
        tests.push({
          endpoint: 'GET /api/v1/students/:id/performance',
          status: 'success',
          message: 'Student performance retrieved successfully'
        });
      } catch (error) {
        tests.push({
          endpoint: 'GET /api/v1/students/:id/performance',
          status: 'error',
          message: `Failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
      }

      // Test getStudentLeaderboard
      try {
        await studentAPI.getStudentLeaderboard(studentId, '62cbc472-9175-4c95-b9f7-3fb0e2abca2f');
        tests.push({
          endpoint: 'GET /api/v1/students/:id/leaderboard',
          status: 'success',
          message: 'Student leaderboard retrieved successfully'
        });
      } catch (error) {
        tests.push({
          endpoint: 'GET /api/v1/students/:id/leaderboard',
          status: 'warning',
          message: `Non-critical failure: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
      }

    } catch (error) {
      tests.push({
        endpoint: 'Student APIs',
        status: 'error',
        message: `Critical failure: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }

    this.results.push({ category, tests });
  }

  private async testTeacherApis() {
    const tests: TestResult[] = [];
    const category = 'Teacher APIs';
    
    try {
      // Test getTeachers
      await teacherAPI.getTeachers();
      tests.push({
        endpoint: 'GET /api/v1/teachers',
        status: 'success',
        message: 'Teachers list retrieved successfully'
      });

      // Test getTeacherDashboard
      try {
        await teacherAPI.getTeacherDashboard('51bf9fe3-570e-41f4-bc5d-01b9c28d1726');
        tests.push({
          endpoint: 'GET /api/v1/teachers/:id/dashboard',
          status: 'success',
          message: 'Teacher dashboard retrieved successfully'
        });
      } catch (error) {
        tests.push({
          endpoint: 'GET /api/v1/teachers/:id/dashboard',
          status: 'error',
          message: `Failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
      }

    } catch (error) {
      tests.push({
        endpoint: 'Teacher APIs',
        status: 'error',
        message: `Critical failure: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }

    this.results.push({ category, tests });
  }

  private async testAdminApis() {
    const tests: TestResult[] = [];
    const category = 'Admin APIs';
    
    try {
      // Test getAdminDashboard
      await adminAPI.getAdminDashboard();
      tests.push({
        endpoint: 'GET /api/v1/admin/dashboard',
        status: 'success',
        message: 'Admin dashboard retrieved successfully'
      });

      // Test getStudents
      await adminAPI.getStudents({ page: 1, limit: 5 });
      tests.push({
        endpoint: 'GET /api/v1/admin/students',
        status: 'success',
        message: 'Admin students list retrieved successfully'
      });

    } catch (error) {
      tests.push({
        endpoint: 'Admin APIs',
        status: 'error',
        message: `Critical failure: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }

    this.results.push({ category, tests });
  }

  private async testUnifiedScoreApis() {
    const tests: TestResult[] = [];
    const category = 'Unified Score APIs';
    
    try {
      // Test getStudentScoreSummary
      await unifiedScoreAPI.getStudentScoreSummary('1fd449cd-d3f6-4343-8298-f6e7392f2941', '62cbc472-9175-4c95-b9f7-3fb0e2abca2f');
      tests.push({
        endpoint: 'GET /api/v1/unified-scores/students/:id/summary',
        status: 'success',
        message: 'Unified score summary retrieved successfully'
      });

    } catch (error) {
      tests.push({
        endpoint: 'Unified Score APIs',
        status: 'error',
        message: `Failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }

    this.results.push({ category, tests });
  }

  private async testInterventionApis() {
    const tests: TestResult[] = [];
    const category = 'Intervention APIs';
    
    try {
      // Test getInterventions
      await interventionAPI.getInterventions({ page: 1, limit: 5 });
      tests.push({
        endpoint: 'GET /api/v1/interventions',
        status: 'success',
        message: 'Interventions list retrieved successfully'
      });

    } catch (error) {
      tests.push({
        endpoint: 'Intervention APIs',
        status: 'error',
        message: `Failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }

    this.results.push({ category, tests });
  }

  generateReport(): string {
    let report = '# API Test Report\n\n';
    
    let totalTests = 0;
    let successfulTests = 0;
    let failedTests = 0;
    let warningTests = 0;

    this.results.forEach(suite => {
      report += `## ${suite.category}\n\n`;
      
      suite.tests.forEach(test => {
        totalTests++;
        const icon = test.status === 'success' ? '✅' : 
                    test.status === 'warning' ? '⚠️' : '❌';
        
        if (test.status === 'success') successfulTests++;
        else if (test.status === 'warning') warningTests++;
        else failedTests++;
        
        report += `${icon} **${test.endpoint}**: ${test.message}`;
        if (test.responseTime) {
          report += ` (${test.responseTime.toFixed(2)}ms)`;
        }
        report += '\n\n';
      });
    });

    report += `## Summary\n\n`;
    report += `- **Total Tests**: ${totalTests}\n`;
    report += `- **Successful**: ${successfulTests}\n`;
    report += `- **Warnings**: ${warningTests}\n`;
    report += `- **Failed**: ${failedTests}\n`;
    report += `- **Success Rate**: ${((successfulTests / totalTests) * 100).toFixed(1)}%\n`;

    return report;
  }
}

export default ApiTester;
