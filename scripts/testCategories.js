const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const API_URL = 'http://localhost:3000/api';
let authToken = '';
let categoryId = '';

// Test data
const testCategory = {
  name: 'Test Category',
  description: 'This is a test category'
};

// Helper function to create form data with image
const createFormData = (data, imagePath) => {
  const formData = new FormData();
  formData.append('name', data.name);
  formData.append('description', data.description);
  if (imagePath) {
    formData.append('image', fs.createReadStream(imagePath));
  }
  return formData;
};

// Test functions
const testCreateCategory = async () => {
  try {
    const imagePath = path.join(__dirname, '../uploads/test-image.jpg');
    const formData = createFormData(testCategory, imagePath);
    
    const response = await axios.post(`${API_URL}/categories`, formData, {
      headers: {
        ...formData.getHeaders(),
        Authorization: `Bearer ${authToken}`
      }
    });
    
    console.log('Create Category Response:', response.data);
    categoryId = response.data.data._id;
    return response.data;
  } catch (error) {
    console.error('Create Category Error:', error.response?.data || error.message);
    throw error;
  }
};

const testGetCategories = async () => {
  try {
    const response = await axios.get(`${API_URL}/categories`);
    console.log('Get Categories Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Get Categories Error:', error.response?.data || error.message);
    throw error;
  }
};

const testGetCategoryById = async () => {
  try {
    const response = await axios.get(`${API_URL}/categories/${categoryId}`);
    console.log('Get Category by ID Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Get Category by ID Error:', error.response?.data || error.message);
    throw error;
  }
};

const testUpdateCategory = async () => {
  try {
    const updateData = {
      name: 'Updated Test Category',
      description: 'This is an updated test category'
    };
    
    const formData = createFormData(updateData);
    const response = await axios.put(`${API_URL}/categories/${categoryId}`, formData, {
      headers: {
        ...formData.getHeaders(),
        Authorization: `Bearer ${authToken}`
      }
    });
    
    console.log('Update Category Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Update Category Error:', error.response?.data || error.message);
    throw error;
  }
};

const testDeleteCategory = async () => {
  try {
    const response = await axios.delete(`${API_URL}/categories/${categoryId}`, {
      headers: {
        Authorization: `Bearer ${authToken}`
      }
    });
    console.log('Delete Category Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Delete Category Error:', error.response?.data || error.message);
    throw error;
  }
};

// Main test function
const runTests = async () => {
  try {
    console.log('Starting Category API Tests...\n');
    
    // Login as admin (you'll need to implement this)
    // const loginResponse = await axios.post(`${API_URL}/auth/login`, {
    //   email: 'admin@example.com',
    //   password: 'adminpassword'
    // });
    // authToken = loginResponse.data.token;
    
    console.log('1. Testing Create Category...');
    await testCreateCategory();
    
    console.log('\n2. Testing Get Categories...');
    await testGetCategories();
    
    console.log('\n3. Testing Get Category by ID...');
    await testGetCategoryById();
    
    console.log('\n4. Testing Update Category...');
    await testUpdateCategory();
    
    console.log('\n5. Testing Delete Category...');
    await testDeleteCategory();
    
    console.log('\nAll tests completed successfully!');
  } catch (error) {
    console.error('\nTest suite failed:', error.message);
  }
};

// Run the tests
runTests(); 