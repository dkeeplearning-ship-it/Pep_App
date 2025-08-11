const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api/v1';

// Test credentials (admin user)
const testCredentials = {
  username: 'admin',
  password: 'password123'
};

let authToken = '';

// Helper function to make authenticated requests
const apiRequest = async (method, endpoint, data = null) => {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        ...(authToken && { 'Authorization': `Bearer ${authToken}` })
      }
    };

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error(`Error ${method} ${endpoint}:`, error.response?.data || error.message);
    throw error;
  }
};

// Test authentication
const authenticate = async () => {
  console.log('🔐 Testing authentication...');
  try {
    const response = await apiRequest('POST', '/auth/login', testCredentials);
    authToken = response.data.token;
    console.log('✅ Authentication successful');
    return true;
  } catch (error) {
    console.error('❌ Authentication failed');
    return false;
  }
};

// Test quadrant operations
const testQuadrantOperations = async () => {
  console.log('\n📊 Testing Quadrant Operations...');
  
  try {
    // Get all quadrants
    console.log('Getting all quadrants...');
    const quadrants = await apiRequest('GET', '/quadrants');
    console.log(`✅ Found ${quadrants.data.length} quadrants`);
    
    if (quadrants.data.length > 0) {
      const firstQuadrant = quadrants.data[0];
      console.log(`Testing hierarchy for quadrant: ${firstQuadrant.name}`);
      
      // Get quadrant hierarchy
      const hierarchy = await apiRequest('GET', `/quadrants/${firstQuadrant.id}/hierarchy`);
      console.log(`✅ Hierarchy retrieved for ${firstQuadrant.name}`);
      console.log(`   Sub-categories: ${hierarchy.data.sub_categories?.length || 0}`);
      
      // Test update quadrant
      const updateData = {
        description: `${firstQuadrant.description} (Updated via API test)`
      };
      const updated = await apiRequest('PUT', `/quadrants/${firstQuadrant.id}`, updateData);
      console.log(`✅ Quadrant updated successfully`);
      
      return firstQuadrant.id;
    }
  } catch (error) {
    console.error('❌ Quadrant operations failed');
    throw error;
  }
};

// Test sub-category operations
const testSubCategoryOperations = async (quadrantId) => {
  console.log('\n📁 Testing Sub-Category Operations...');
  
  try {
    // Create a sub-category
    const subCategoryData = {
      quadrant_id: quadrantId,
      name: 'Test Sub-Category',
      description: 'Created via API test',
      weightage: 25,
      display_order: 1
    };
    
    const created = await apiRequest('POST', '/sub-categories', subCategoryData);
    console.log(`✅ Sub-category created: ${created.data.name}`);
    
    // Get all sub-categories for the quadrant
    const subCategories = await apiRequest('GET', `/sub-categories?quadrant_id=${quadrantId}`);
    console.log(`✅ Found ${subCategories.data.length} sub-categories for quadrant`);
    
    // Update the sub-category
    const updateData = {
      description: 'Updated via API test',
      weightage: 30
    };
    const updated = await apiRequest('PUT', `/sub-categories/${created.data.id}`, updateData);
    console.log(`✅ Sub-category updated successfully`);
    
    return created.data.id;
  } catch (error) {
    console.error('❌ Sub-category operations failed');
    throw error;
  }
};

// Test component operations
const testComponentOperations = async (subCategoryId) => {
  console.log('\n🧩 Testing Component Operations...');
  
  try {
    // Create a component
    const componentData = {
      sub_category_id: subCategoryId,
      name: 'Test Component',
      description: 'Created via API test',
      weightage: 50,
      max_score: 10,
      category: 'Professional',
      display_order: 1
    };
    
    const created = await apiRequest('POST', '/components', componentData);
    console.log(`✅ Component created: ${created.data.name}`);
    
    // Get all components for the sub-category
    const components = await apiRequest('GET', `/components?sub_category_id=${subCategoryId}`);
    console.log(`✅ Found ${components.data.length} components for sub-category`);
    
    // Update the component
    const updateData = {
      description: 'Updated via API test',
      max_score: 15
    };
    const updated = await apiRequest('PUT', `/components/${created.data.id}`, updateData);
    console.log(`✅ Component updated successfully`);
    
    return created.data.id;
  } catch (error) {
    console.error('❌ Component operations failed');
    throw error;
  }
};

// Test microcompetency operations
const testMicrocompetencyOperations = async (componentId) => {
  console.log('\n⚡ Testing Microcompetency Operations...');
  
  try {
    // Create a microcompetency
    const microcompetencyData = {
      component_id: componentId,
      name: 'Test Microcompetency',
      description: 'Created via API test',
      weightage: 100,
      max_score: 10,
      display_order: 1
    };
    
    const created = await apiRequest('POST', '/microcompetencies', microcompetencyData);
    console.log(`✅ Microcompetency created: ${created.data.name}`);
    
    // Get all microcompetencies for the component
    const microcompetencies = await apiRequest('GET', `/microcompetencies?componentId=${componentId}`);
    console.log(`✅ Found ${microcompetencies.data.length} microcompetencies for component`);
    
    // Update the microcompetency
    const updateData = {
      description: 'Updated via API test',
      max_score: 15
    };
    const updated = await apiRequest('PUT', `/microcompetencies/${created.data.id}`, updateData);
    console.log(`✅ Microcompetency updated successfully`);
    
    return created.data.id;
  } catch (error) {
    console.error('❌ Microcompetency operations failed');
    throw error;
  }
};

// Test cleanup (delete created items)
const testCleanup = async (microcompetencyId, componentId, subCategoryId) => {
  console.log('\n🧹 Testing Cleanup Operations...');
  
  try {
    // Delete microcompetency
    await apiRequest('DELETE', `/microcompetencies/${microcompetencyId}`);
    console.log('✅ Microcompetency deleted');
    
    // Delete component
    await apiRequest('DELETE', `/components/${componentId}`);
    console.log('✅ Component deleted');
    
    // Delete sub-category
    await apiRequest('DELETE', `/sub-categories/${subCategoryId}`);
    console.log('✅ Sub-category deleted');
    
  } catch (error) {
    console.error('❌ Cleanup operations failed');
    throw error;
  }
};

// Main test function
const runTests = async () => {
  console.log('🚀 Starting PEP Quadrant Management API Tests\n');
  
  try {
    // Authenticate
    const authenticated = await authenticate();
    if (!authenticated) {
      console.error('❌ Cannot proceed without authentication');
      return;
    }
    
    // Test all operations
    const quadrantId = await testQuadrantOperations();
    const subCategoryId = await testSubCategoryOperations(quadrantId);
    const componentId = await testComponentOperations(subCategoryId);
    const microcompetencyId = await testMicrocompetencyOperations(componentId);
    
    // Cleanup
    await testCleanup(microcompetencyId, componentId, subCategoryId);
    
    console.log('\n🎉 All tests completed successfully!');
    console.log('✅ The PEP Quadrant Management system is working correctly');
    
  } catch (error) {
    console.error('\n❌ Tests failed:', error.message);
    process.exit(1);
  }
};

// Run the tests
runTests();
