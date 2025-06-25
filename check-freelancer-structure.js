// Script para verificar la estructura de freelancers

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImU1ZGEzMWI3LTkzNTgtNDkzOS05ZGVkLWI0MGMyMGM0YWMyYiIsImVtYWlsIjoiYWRyaWFuby5hcXAwMEBnbWFpbC5jb20iLCJ1c2VyVHlwZSI6ImNsaWVudCIsInByb3ZpZGVyIjoiZ29vZ2xlIiwiaWF0IjoxNzUwODQxNjYxLCJleHAiOjE3NTE0NDY0NjF9.H9dGBNATXc6PbniqbwSm0q04mb-74OVxMYLG-UJTIak';

async function checkFreelancerStructure() {
  try {
    console.log('🔍 Verificando estructura de freelancers...');
    
    const response = await fetch('http://localhost:3001/api/freelancers', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = await response.json();
    console.log('📋 Status:', response.status);
    
    if (data.freelancers && data.freelancers.length > 0) {
      console.log('\n📄 Estructura completa del primer freelancer:');
      console.log(JSON.stringify(data.freelancers[0], null, 2));
      
      console.log('\n🔑 Campos disponibles:');
      Object.keys(data.freelancers[0]).forEach(key => {
        console.log(`   - ${key}: ${data.freelancers[0][key]}`);
      });
    } else {
      console.log('❌ No se encontraron freelancers');
      console.log('Data completa:', JSON.stringify(data, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Ejecutar la verificación
checkFreelancerStructure();