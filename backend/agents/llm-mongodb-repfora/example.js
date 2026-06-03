/**
 * Ejemplo de uso del LLM MongoDB Agent para REPFORA
 *
 * Este archivo muestra cómo usar el agente para hacer preguntas
 * en español sobre la base de datos y obtener respuestas en lenguaje natural.
 */

import mongoose from 'mongoose';
import { quickAsk, createAgent } from './agent.js';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

/**
 * Conexión a MongoDB
 */
async function connectToMongo() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/repfora';
    await mongoose.connect(mongoUri);
    console.log('✅ Conectado a MongoDB');
  } catch (error) {
    console.error('❌ Error conectando a MongoDB:', error);
    throw error;
  }
}

/**
 * Ejemplo 1: Uso rápido con quickAsk
 */
async function exampleQuickAsk() {
  console.log('\n' + '='.repeat(70));
  console.log('EJEMPLO 1: Uso rápido con quickAsk');
  console.log('='.repeat(70));

  const question = '¿Cuántos instructores hay en el sistema?';

  const response = await quickAsk(question);

  console.log('\n📝 PREGUNTA:', response.question);
  console.log('\n💡 RESPUESTA:\n');
  console.log(response.answer);
  console.log('\n📊 METADATOS:', JSON.stringify(response.metadata, null, 2));
}

/**
 * Ejemplo 2: Uso con instancia del agente (para múltiples preguntas)
 */
async function exampleAgentInstance() {
  console.log('\n' + '='.repeat(70));
  console.log('EJEMPLO 2: Uso con instancia del agente');
  console.log('='.repeat(70));

  // Crear e inicializar el agente
  const agent = createAgent({
    geminiApiKey: process.env.GEMINI_API_KEY,
    maxRetries: 2,
    cacheSchemas: true,
    useLLMForResponse: true
  });

  await agent.initialize();

  // Hacer múltiples preguntas
  const questions = [
    'Listar los últimos 5 horarios creados',
    'Buscar programas cuyo nombre contenga "análisis"',
    '¿Cuáles son los ambientes de aprendizaje disponibles?'
  ];

  for (const question of questions) {
    const response = await agent.ask(question);
    console.log('\n📝 PREGUNTA:', response.question);
    console.log('\n💡 RESPUESTA:\n');
    console.log(response.answer);
  }

  // Mostrar estadísticas
  console.log('\n📊 ESTADÍSTICAS DEL AGENTE:');
  console.log(JSON.stringify(agent.getStats(), null, 2));

  // Limpiar recursos
  agent.cleanup();
}

/**
 * Ejemplo 3: Manejo de errores
 */
async function exampleErrorHandling() {
  console.log('\n' + '='.repeat(70));
  console.log('EJEMPLO 3: Manejo de errores');
  console.log('='.repeat(70));

  const agent = createAgent();
  await agent.initialize();

  // Pregunta que podría fallar
  const response = await agent.ask('Buscar en la colección inexistente todos los registros');

  if (response.success) {
    console.log('\n✅ Respuesta exitosa');
    console.log(response.answer);
  } else {
    console.log('\n❌ Error manejado:');
    console.log(response.answer);
    console.log('Error original:', response.error);
  }

  agent.cleanup();
}

/**
 * Ejemplo 4: Preguntas complejas
 */
async function exampleComplexQuestions() {
  console.log('\n' + '='.repeat(70));
  console.log('EJEMPLO 4: Preguntas complejas');
  console.log('='.repeat(70));

  const agent = createAgent();
  await agent.initialize();

  const complexQuestions = [
    'Contar cuántos aprendices hay por cada ficha',
    'Listar los instructores con más de 100 horas trabajadas',
    'Mostrar los horarios del programa de ADSO ordenados por fecha'
  ];

  const responses = await agent.askBatch(complexQuestions);

  responses.forEach((response, index) => {
    console.log(`\n${index + 1}. ${response.question}`);
    console.log(`Respuesta: ${response.answer.substring(0, 150)}...`);
    console.log(`Éxito: ${response.success ? 'Sí' : 'No'}`);
  });

  agent.cleanup();
}

/**
 * Función principal para ejecutar los ejemplos
 */
async function main() {
  try {
    // Conectar a MongoDB
    await connectToMongo();

    // Ejecutar ejemplos
    await exampleQuickAsk();
    await exampleAgentInstance();
    await exampleErrorHandling();
    await exampleComplexQuestions();

    console.log('\n✅ Todos los ejemplos completados exitosamente');

  } catch (error) {
    console.error('\n❌ Error en los ejemplos:', error);
  } finally {
    // Cerrar conexión a MongoDB
    await mongoose.connection.close();
    console.log('\n🔌 Conexión a MongoDB cerrada');
    process.exit(0);
  }
}

// Ejecutar si este archivo es el principal
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export {
  exampleQuickAsk,
  exampleAgentInstance,
  exampleErrorHandling,
  exampleComplexQuestions
};
